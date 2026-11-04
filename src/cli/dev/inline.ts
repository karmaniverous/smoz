import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
import { packageDirectorySync } from 'package-directory';

import {
  localTsxCli,
  pathCommand,
  type SpawnSpec,
} from '@/src/cli/util/command';

/**
 * Command running `tsEntry` with tsx: the project's tsx CLI under the
 * current Node when installed, else `tsx` from PATH.
 *
 * @throws Error when tsx is neither installed in the project nor on PATH
 */
export const resolveTsxCommand = (root: string, tsEntry: string): SpawnSpec => {
  const localCli = localTsxCli(root);
  if (localCli) {
    return { cmd: process.execPath, args: [localCli, tsEntry], shell: false };
  }
  const probe = pathCommand('tsx', ['--version']);
  const { status } = spawnSync(probe.cmd, probe.args, { shell: probe.shell });
  if (status === 0) return pathCommand('tsx', [tsEntry]);
  throw new Error(
    'Inline requires tsx. Install it with "npm i -D tsx", or run "smoz dev -l offline".',
  );
};

export const resolveInlineEntry = (
  pkgRoot: string,
): { entry: string; kind: 'compiled' | 'ts' } => {
  const compiled = path.resolve(
    pkgRoot,
    'dist',
    'mjs',
    'cli',
    'inline-server.js',
  );
  if (fs.existsSync(compiled)) return { entry: compiled, kind: 'compiled' };
  const tsPath = path.resolve(
    pkgRoot,
    'src',
    'cli',
    'local',
    'inline.server',
    'index.ts',
  );
  return { entry: tsPath, kind: 'ts' };
};

export const launchInline = async (
  root: string,
  opts: { stage: string; port: number; verbose: boolean },
) => {
  // Resolve the installed smoz package root robustly (works from compiled CLI and tsx ESM):
  // Prefer __dirname when available (CJS), otherwise derive from import.meta.url (ESM).
  const here =
    typeof __dirname === 'string'
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = packageDirectorySync({ cwd: here }) ?? process.cwd();
  const { entry } = resolveInlineEntry(pkgRoot);

  const makeTsx = () => {
    const { cmd, args, shell } = resolveTsxCommand(root, entry);
    return (async () => {
      const env = buildSpawnEnv({
        ...process.env,
        // Enable tsconfig paths for "@/..." during TS fallback.
        TSX_TSCONFIG_PATHS: '1',
        SMOZ_STAGE: opts.stage,
        SMOZ_PORT: String(opts.port),
        SMOZ_VERBOSE: opts.verbose ? '1' : '',
      });
      return spawn(cmd, args, {
        cwd: root,
        stdio: 'inherit',
        shell,
        env,
      });
    })();
  };

  let child = await makeTsx();
  const close = async () =>
    new Promise<void>((resolve) => {
      // If the process has already exited (exitCode set), resolve immediately.
      if (child.exitCode !== null) {
        resolve();
        return;
      }
      child.once('exit', () => {
        resolve();
      });
      child.kill('SIGTERM');
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  const restart = async () => {
    await close();
    child = await makeTsx();
  };
  return { close, restart };
};
