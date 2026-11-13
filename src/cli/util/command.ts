/**
 * Cross-platform child process commands for the CLI.
 *
 * Never passes an args array together with `shell: true` (Node DEP0190:
 * args would be concatenated unescaped).
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/** Arguments for `spawn`/`spawnSync`: `spawn(cmd, args, { shell })`. */
export interface SpawnSpec {
  cmd: string;
  args: string[];
  shell: boolean;
}

/**
 * Quote one token for a cmd.exe command line.
 *
 * Rejects what quoting can't make safe: `"` (ends the quotes), `%` (cmd.exe
 * expands `%VAR%` even inside quotes) and, in a token that needs quotes, a
 * trailing `\` (it would escape the closing quote).
 */
const quoteForCmd = (token: string): string => {
  const reject = (what: string) =>
    new Error(
      `Cannot pass an argument containing ${what} through the Windows shell: ${token}`,
    );
  if (token.includes('"')) throw reject('a double quote');
  if (token.includes('%')) throw reject('a percent sign');
  if (/^[\w./\\:=@+-]+$/.test(token)) return token;
  if (token.endsWith('\\')) throw reject('a trailing backslash');
  return `"${token}"`;
};

/**
 * Command for a binary found on PATH (e.g. `npm`, `tsx`, `serverless`).
 *
 * POSIX: spawned directly, no shell. Windows: these are `.cmd` shims, which
 * Node only runs through the shell, so the command is one pre-quoted command
 * line with no args array.
 *
 * @param bin - binary name without extension
 * @param args - arguments (on Windows: no `"` or `%`, and no trailing `\` in an argument that needs quotes)
 * @param platform - target platform (defaults to the current one)
 * @returns spawn arguments
 * @throws Error on Windows when an argument contains `"` or `%`, or needs quotes and ends with `\`
 */
export const pathCommand = (
  bin: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): SpawnSpec =>
  platform === 'win32'
    ? { cmd: [bin, ...args].map(quoteForCmd).join(' '), args: [], shell: true }
    : { cmd: bin, args: [...args], shell: false };

/**
 * Absolute path of the tsx CLI installed for the project at `root`, or
 * undefined when tsx isn't resolvable from there.
 *
 * @param root - project root (a directory containing package.json)
 */
export const localTsxCli = (root: string): string | undefined => {
  try {
    return createRequire(path.resolve(root, 'package.json')).resolve('tsx/cli');
  } catch {
    return undefined;
  }
};

/**
 * The `node_modules` directories Node searches for a package required from
 * `root`, nearest first: `root`'s own, then each ancestor's up to the
 * filesystem root. Like Node, skips directories that are themselves named
 * `node_modules`. Unlike `require.resolve.paths`, never includes `NODE_PATH`
 * or Node's global folders.
 *
 * @param root - directory to start from
 */
const ancestorNodeModules = (root: string): string[] => {
  const dirs: string[] = [];
  let dir = path.resolve(root);
  for (;;) {
    if (path.basename(dir) !== 'node_modules')
      dirs.push(path.join(dir, 'node_modules'));
    const parent = path.dirname(dir);
    if (parent === dir) return dirs;
    dir = parent;
  }
};

/**
 * Absolute path of a package's CLI script as installed for the project at
 * `root`, or undefined when the package isn't installed there or has no such
 * bin.
 *
 * Finds the package the way Node does: the nearest copy wins, searching
 * `root`'s own `node_modules` and then each ancestor's. That finds packages
 * npm hoisted to a workspace root (e.g. prettier at `<repo>/node_modules` for
 * a service in `<repo>/packages/service`), and a project's own copy shadows a
 * hoisted one. Global installs (`NODE_PATH`, Node's global folders) are
 * ignored. The script is read from the package's `bin` field, so it follows
 * the installed version's layout (e.g. serverless v4 ships `run.js`).
 *
 * @param root - project root (a directory containing package.json)
 * @param pkg - package name, e.g. `prettier` or `@scope/name`
 * @param binName - bin entry to use when `bin` is an object (defaults to the
 *   package name without its scope)
 */
export const localPackageBin = (
  root: string,
  pkg: string,
  binName: string = pkg.split('/').pop() ?? pkg,
): string | undefined => {
  const pkgDir = ancestorNodeModules(root)
    .map((dir) => path.join(dir, pkg))
    .find((dir) => existsSync(path.join(dir, 'package.json')));
  if (!pkgDir) return undefined;

  let bin: unknown;
  try {
    ({ bin } = JSON.parse(
      readFileSync(path.join(pkgDir, 'package.json'), 'utf8'),
    ) as { bin?: unknown });
  } catch {
    return undefined;
  }
  const rel =
    typeof bin === 'string'
      ? bin
      : bin !== null && typeof bin === 'object'
        ? (bin as Record<string, unknown>)[binName]
        : undefined;
  if (typeof rel !== 'string') return undefined;

  const script = path.resolve(pkgDir, rel);
  return existsSync(script) ? script : undefined;
};
