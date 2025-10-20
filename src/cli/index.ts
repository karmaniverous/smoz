/**
 * SMOZ CLI — get-dotenv host bootstrap (plugin-first).
 *
 * - Always delegate to the get-dotenv host (no legacy fallbacks).
 * - Branding: "<pkg> v<version>" passed to the host.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { packageDirectorySync } from 'package-directory';

import { runWithHost } from './host/index';

type Pkg = { name?: string; version?: string };
const getRepoRoot = (): string => packageDirectorySync() ?? process.cwd();
const readPkg = (root: string): Pkg => {
  try {
    const raw = readFileSync(join(root, 'package.json'), 'utf8');
    return JSON.parse(raw) as Pkg;
  } catch {
    return {};
  }
};

const main = async (): Promise<void> => {
  const root = getRepoRoot();
  const pkg = readPkg(root);
  const branding = `${pkg.name ?? 'smoz'} v${pkg.version ?? '0.0.0'}`;
  const argv = process.argv.slice(2);

  try {
    await runWithHost(argv, branding);
  } catch (e) {
    console.error((e as Error).message);
    // Hard-fail so shell `&&` chains stop when the host is unavailable
    // or does not expose a known entry point.
    process.exit(1);
  }
};

void main();
