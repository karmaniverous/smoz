// templates:lint
// Lint templates/default with its own ESLint config. That config imports
// `@karmaniverous/smoz/eslint`, which an app resolves from its node_modules.
// Inside this repo the template has none, so link the package (this repo, built
// first) into templates/default/node_modules for the run, then remove the link.
// Extra arguments (e.g. --fix) pass through to ESLint.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';

import { localPackageBin } from '../src/cli/util/command';

const repoRoot = process.cwd();
const templateDir = path.join(repoRoot, 'templates', 'default');
const nodeModules = path.join(templateDir, 'node_modules');
const link = path.join(nodeModules, '@karmaniverous', 'smoz');

if (!existsSync(path.join(repoRoot, 'dist', 'mjs', 'eslint.js'))) {
  console.error('templates:lint: build smoz first (npm run build).');
  process.exit(1);
}

const createdNodeModules = !existsSync(nodeModules);
mkdirSync(path.dirname(link), { recursive: true });
rmSync(link, { recursive: true, force: true });
symlinkSync(repoRoot, link, 'junction');

let status: number;
try {
  const eslintJs = localPackageBin(repoRoot, 'eslint');
  if (!eslintJs) throw new Error('templates:lint: eslint is not installed.');
  const res = spawnSync(
    process.execPath,
    [
      eslintJs,
      '-c',
      'templates/default/eslint.config.ts',
      'templates/default/**/*.{ts,tsx,js,jsx}',
      'templates/default/eslint.config.ts',
      ...process.argv.slice(2),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  status = res.status ?? 1;
} finally {
  // Remove the link itself, never what it points to.
  rmSync(link, { force: true });
  if (createdNodeModules) rmSync(nodeModules, { recursive: true, force: true });
}
process.exit(status);
