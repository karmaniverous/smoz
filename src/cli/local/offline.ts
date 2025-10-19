/**
 * serverless-offline runner (dev-only).
 *
 * - Provides sane TMP/TEMP/TMPDIR fallbacks to avoid "undefined\\temp\\..." paths.
 * - Spawns the local Serverless CLI to run "offline start".
 * - Provides restart/close helpers for the dev orchestrator.
 * - Avoids unnecessary nullish-coalescing so ESLint doesn't flag conditions.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { buildSpawnEnvMaybe } from '@/src/cli/util/spawnEnv';

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
  const slsJs = path.resolve(
    root,
    'node_modules',
    'serverless',
    'bin',
    'serverless.js',
  );

  const makeCmd = () => {
    const args: string[] = [];
    let cmd: string;
    let shell = false;
    if (fs.existsSync(slsJs)) {
      cmd = process.execPath;
      args.push(
        slsJs,
        'offline',
        'start',
        '--stage',
        opts.stage,
        '--httpPort',
        String(typeof opts.port === 'number' ? opts.port : 0),
      );
    } else {
      // Fallback to PATH
      cmd = process.platform === 'win32' ? 'serverless.cmd' : 'serverless';
      args.push(
        'offline',
        'start',
        '--stage',
        opts.stage,
        '--httpPort',
        String(typeof opts.port === 'number' ? opts.port : 0),
      );
      shell = true;
    }
    return { cmd, args, shell };
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
  cmd: { cmd: string; args: string[]; shell: boolean },
  verbose: boolean,
): Promise<ReturnType<typeof spawn>> => {
  // Normalize child environment via get-dotenv when available; safe fallback otherwise.
  const baseEnv: NodeJS.ProcessEnv = { ...process.env };
  const childEnv = await buildSpawnEnvMaybe(baseEnv);

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
