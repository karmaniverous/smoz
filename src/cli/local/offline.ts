/**
 * serverless-offline runner (dev-only).
 *
 * - Provides sane TMP/TEMP/TMPDIR fallbacks to avoid "undefined\\temp\\..." paths.
 * - Spawns the local Serverless CLI to run "offline start".
 * - Provides restart/close helpers for the dev orchestrator.
 * - Avoids unnecessary nullish-coalescing so ESLint doesn't flag conditions.
 */
import { spawn } from 'node:child_process';

import { buildSpawnEnv } from '@karmaniverous/get-dotenv';

import {
  localPackageBin,
  pathCommand,
  type SpawnSpec,
} from '@/src/cli/util/command';

export type OfflineRunner = {
  restart: () => Promise<void>;
  close: () => Promise<void>;
};
type LaunchOpts = {
  stage: string;
  port: number;
  verbose: boolean;
};

export const launchOffline = async (
  root: string,
  opts: LaunchOpts,
): Promise<OfflineRunner> => {
  const makeCmd = (): SpawnSpec => {
    const args = [
      'offline',
      'start',
      '--stage',
      opts.stage,
      '--httpPort',
      String(typeof opts.port === 'number' ? opts.port : 0),
    ];
    // Looked up per launch so a restart picks up an install or removal.
    const slsJs = localPackageBin(root, 'serverless');
    return slsJs
      ? { cmd: process.execPath, args: [slsJs, ...args], shell: false }
      : // Fallback to PATH
        pathCommand('serverless', args);
  };

  let child = await spawnOffline(root, makeCmd(), opts.verbose);

  const close = async (): Promise<void> =>
    new Promise<void>((resolve) => {
      if (child.killed) {
        resolve();
        return;
      }
      child.once('exit', () => {
        resolve();
      });
      child.kill('SIGTERM');
      // Safety timeout
      setTimeout(() => {
        resolve();
      }, 1500);
    });

  const restart = async (): Promise<void> => {
    await close();
    child = await spawnOffline(root, makeCmd(), opts.verbose);
  };

  return { restart, close };
};

const spawnOffline = async (
  root: string,
  cmd: SpawnSpec,
  verbose: boolean,
): Promise<ReturnType<typeof spawn>> => {
  // Normalize child environment via get-dotenv when available; safe fallback otherwise.
  const baseEnv: NodeJS.ProcessEnv = { ...process.env };
  const childEnv = buildSpawnEnv(baseEnv);

  // Optional diagnostics to verify the child sees sane temp-related envs
  if (verbose) {
    const snap = {
      TMPDIR: childEnv.TMPDIR,
      TEMP: childEnv.TEMP,
      TMP: childEnv.TMP,
      HOME: childEnv.HOME,
      USERPROFILE: childEnv.USERPROFILE,
      LOCALAPPDATA: childEnv.LOCALAPPDATA,
    };
    process.stdout.write(`[offline] env snapshot: ${JSON.stringify(snap)}\n`);
  }

  const child = spawn(cmd.cmd, cmd.args, {
    cwd: root,
    shell: cmd.shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: childEnv,
  });

  const prefix = '[offline] ';
  let announced = false;
  const emit = (buf: Buffer) => {
    const text = buf.toString('utf8');
    if (verbose) process.stdout.write(prefix + text);
    // Detect the actual listening URL and announce it once to avoid "0" confusion.
    const m = text.match(
      /listening on (https?:\/\/(?:localhost|127\.0\.0\.1):\d+)/i,
    );
    const url = m?.[1];
    if (url && !announced) {
      announced = true;
      // Print a concise, canonical URL line.
      process.stdout.write(`[dev] offline: ${url}\n`);
    }
  };
  const emitErr = (buf: Buffer) => {
    const text = buf.toString('utf8');
    process.stderr.write(prefix + text);
  };
  // With stdio: 'pipe', these streams are present
  child.stdout.on('data', emit);
  child.stderr.on('data', emitErr);
  child.on('error', (err) => {
    process.stderr.write(`${prefix}${err.message}\n`);
  });

  return child;
};
