/**
 * CLI baseline harness: runs the smoz CLI from source over a fixed corpus
 * (`--help` of every command, `-V`, and `init` into a temp directory) and
 * reduces each run to a structure that is compared with the recorded 0.4.1
 * baseline in `test/baseline-0.4.1/`. Spawns child processes (tsx); writes
 * only to temp directories.
 *
 * @module
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root. */
export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

/** Directory holding the recorded 0.4.1 baseline. */
export const baselineDir = path.join(repoRoot, 'test', 'baseline-0.4.1');

/** One case of the corpus. */
export interface BaselineCase {
  /** Case id; also the baseline file name (`<id>.txt`). */
  id: string;
  /** Arguments after `smoz`. */
  args: string[];
  /** `init` cases run in an empty temp directory and record what it wrote. */
  kind: 'help' | 'version' | 'init';
}

const helpOf = (...command: string[]): BaselineCase => ({
  id: ['help', ...(command.length ? command : ['root'])].join('-'),
  args: [...command, '--help'],
  kind: 'help',
});

/** The corpus: every command's help, the version flag, and `init`. */
export const baselineCases: BaselineCase[] = [
  helpOf(),
  helpOf('init'),
  helpOf('add'),
  helpOf('register'),
  helpOf('openapi'),
  helpOf('dev'),
  helpOf('aws'),
  helpOf('cmd'),
  helpOf('batch'),
  helpOf('batch', 'cmd'),
  { id: 'version', args: ['-V'], kind: 'version' },
  { id: 'init', args: ['init', '--yes', '--no-install'], kind: 'init' },
];

/** The output of one run. */
export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

const tsxCli = createRequire(import.meta.url).resolve('tsx/cli');

/**
 * `process.env` without vitest's worker variables: the child is not a vitest
 * worker, and get-dotenv's root help prints nothing when it sees
 * `VITEST_WORKER_ID`.
 */
const childEnv = (): NodeJS.ProcessEnv =>
  Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith('VITEST')),
  );

/**
 * Run the smoz CLI from source (`tsx src/cli/index.ts`), as the repo's own
 * npm scripts do.
 *
 * @param args - arguments after `smoz`
 * @param cwd - working directory
 * @param env - extra environment
 */
export const runSmozFromSource = (
  args: string[],
  cwd: string = repoRoot,
  env: NodeJS.ProcessEnv = {},
): Promise<RunResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        tsxCli,
        // tsx looks for tsconfig.json (the '@/' paths) from the cwd.
        '--tsconfig',
        path.join(repoRoot, 'tsconfig.json'),
        path.join(repoRoot, 'src', 'cli', 'index.ts'),
        ...args,
      ],
      {
        cwd,
        env: { ...childEnv(), NO_COLOR: '1', ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });

const listFiles = (root: string, rel = ''): string[] =>
  readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap((e) => {
    const child = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? listFiles(root, child) : [child];
  });

/**
 * Render one case's output as the text stored in the baseline: stdout, then
 * for `init` the files written and the generated `package.json` (with the temp
 * directory's name replaced by `<app>`), then stderr if any, and the exit code.
 */
export const recordCase = async (c: BaselineCase): Promise<string> => {
  if (c.kind !== 'init') return render(await runSmozFromSource(c.args));
  const dir = mkdtempSync(path.join(os.tmpdir(), 'smoz-baseline-'));
  try {
    const result = await runSmozFromSource(c.args, dir);
    const files = listFiles(dir).sort();
    const pkg = readFileSync(path.join(dir, 'package.json'), 'utf8').replace(
      `"name": "${path.basename(dir)}"`,
      '"name": "<app>"',
    );
    return render({
      ...result,
      stdout: [
        result.stdout.trimEnd(),
        '--- files ---',
        ...files,
        '--- package.json ---',
        pkg.trimEnd(),
      ].join('\n'),
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const render = ({ code, stdout, stderr }: RunResult): string =>
  [
    stdout.trimEnd(),
    ...(stderr.trim() ? ['--- stderr ---', stderr.trimEnd()] : []),
    `--- exit ${String(code)} ---`,
    '',
  ].join('\n');

/**
 * The parts of a recorded case that the baseline compares. Help output is
 * reduced to its structure (header lines, usage, description, and the terms of
 * each section: option flags, command names), so that wrapping and option
 * descriptions don't count; any other case is compared as text.
 */
export type CaseParts = Record<string, string>;

const sectionHeading = /^\S.*:$/;

/** `init` parts: its stdout, the files written, and each `package.json` key. */
const initParts = (text: string): CaseParts => {
  const [stdout = '', rest = ''] = text.split('--- files ---\n');
  const [files = '', pkg = '{}'] = rest.split('--- package.json ---\n');
  const manifest = JSON.parse(pkg) as Record<string, unknown>;
  return {
    text: stdout.trim(),
    files: files.trim(),
    ...Object.fromEntries(
      Object.entries(manifest).map(([k, v]) => [
        `package.json:${k}`,
        JSON.stringify(v, null, 2),
      ]),
    ),
  };
};

/**
 * Split a recorded case into its comparable parts: `exit`, then for help
 * `header`, `usage`, `description` and one `section:<heading>` per section
 * (its terms, one per line); for `init` `text` (stdout), `files` and one
 * `package.json:<key>` per manifest key; and for any other case `text`.
 */
export const caseParts = (
  kind: BaselineCase['kind'],
  text: string,
): CaseParts => {
  const lines = text.replace(/\r\n/g, '\n').trimEnd().split('\n');
  const exit = lines.pop() ?? '';
  if (kind === 'init') return { exit, ...initParts(lines.join('\n')) };
  if (kind !== 'help') return { exit, text: lines.join('\n') };
  const usageAt = lines.findIndex((l) => l.startsWith('Usage: '));
  const parts: CaseParts = {
    exit,
    header: lines.slice(0, Math.max(usageAt, 0)).filter(Boolean).join('\n'),
    usage: lines[usageAt] ?? '',
  };
  const sections = new Map<string, string[]>();
  const description: string[] = [];
  let terms: string[] | undefined;
  for (const line of lines.slice(usageAt + 1)) {
    if (sectionHeading.test(line)) {
      terms = [];
      sections.set(`section:${line.slice(0, -1)}`, terms);
    } else if (terms === undefined) {
      if (line.trim()) description.push(line.trim());
    } else if (/^ {2}\S/.test(line)) {
      terms.push(line.slice(2).split(/\s{2,}/)[0] ?? '');
    }
  }
  parts.description = description.join(' ');
  for (const [section, list] of sections) parts[section] = list.join('\n');
  return parts;
};

/** Read a case's recorded baseline text. */
export const readBaseline = (id: string): string =>
  readFileSync(path.join(baselineDir, `${id}.txt`), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
