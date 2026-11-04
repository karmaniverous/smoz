// templates:typecheck
// 1. Discover template tsconfig.json files under templates/* and run
//    "tsc -p --noEmit" for each.
// 2. Prove `smoz add` output compiles: scaffold functions into a temporary
//    copy of templates/default and typecheck the copy.
// Fails fast with a readable template name; prints stdout and stderr on
// failure (to stdout) for complete diagnostics.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { runAdd } from '../src/cli/add';

const repoRoot = process.cwd();
const templatesDir = path.join(repoRoot, 'templates');
const tscJs = createRequire(path.join(repoRoot, 'package.json')).resolve(
  'typescript/lib/tsc.js',
);

const isDir = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const findTemplateConfigs = (): Array<{ name: string; tsconfig: string }> => {
  if (!existsSync(templatesDir)) return [];
  const out: Array<{ name: string; tsconfig: string }> = [];
  for (const name of readdirSync(templatesDir)) {
    // Only real templates: skip 'project' and dot folders (e.g. scratch copies).
    if (name === 'project' || name.startsWith('.')) continue;
    const dir = path.join(templatesDir, name);
    if (!isDir(dir)) continue;
    const tsconfig = path.join(dir, 'tsconfig.json');
    if (existsSync(tsconfig)) out.push({ name, tsconfig });
  }
  return out;
};

/** Typecheck one tsconfig with the repo's TypeScript; exit on failure. */
const typecheck = (label: string, tsconfig: string) => {
  console.log(`Typechecking ${label}`);
  const args = [tscJs, '-p', tsconfig, '--noEmit', '--pretty', 'false'];
  const res = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  const out = res.stdout.trim();
  const err = res.stderr.trim();
  if (res.status !== 0) {
    console.log(`Typecheck failed for ${label}`);
    if (res.error) console.log(`--- spawn error ---\n${String(res.error)}`);
    if (out.length) console.log(`--- tsc stdout ---\n${out}`);
    if (err.length) console.log(`--- tsc stderr ---\n${err}`);
    console.log(`--- invoked ---\n${[process.execPath, ...args].join(' ')}`);
    process.exit(res.status ?? 1);
  }
  if (out.length) console.log(out);
};

/** Specs scaffolded into the default template copy (HTTP, path param, non-HTTP). */
const addSpecs = ['rest/widgets/post', 'rest/widgets/:id/get', 'sqs/jobs/run'];

const typecheckAddOutput = async () => {
  // A sibling of templates/default, so the copy's relative paths
  // (../../dist, ../../node_modules) still resolve.
  const copy = path.join(templatesDir, '.add-check');
  rmSync(copy, { recursive: true, force: true });
  try {
    for (const entry of ['app', 'types', 'tsconfig.json', 'tsconfig.base.json'])
      cpSync(
        path.join(templatesDir, 'default', entry),
        path.join(copy, entry),
        { recursive: true },
      );
    for (const spec of addSpecs) await runAdd(copy, spec);
    typecheck(
      `smoz add output (${addSpecs.join(', ')})`,
      path.join(copy, 'tsconfig.json'),
    );
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
};

const run = async () => {
  const targets = findTemplateConfigs();
  if (targets.length === 0) {
    console.log('No template tsconfig.json files found under templates/*.');
    return;
  }
  for (const t of targets) typecheck(`template: ${t.name}`, t.tsconfig);
  await typecheckAddOutput();
  console.log('All templates typecheck OK.');
};

await run();
