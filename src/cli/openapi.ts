/**
 * @module OpenAPI one-shot runner.
 *
 * Spawns the project-local OpenAPI script via tsx, then formats the output
 * with prettier. Owns the full generate-and-format cycle so consumers can
 * use a single `smoz openapi` invocation.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildSpawnEnv } from '@karmaniverous/get-dotenv';

interface SpawnSpec {
  cmd: string;
  args: string[];
  shell: boolean;
}

const findTsxCli = (root: string): SpawnSpec => {
  // Prefer invoking the JS entry to avoid shell .cmd quirks on Windows.
  const js = path.resolve(root, 'node_modules', 'tsx', 'dist', 'cli.js');
  if (existsSync(js)) {
    return {
      cmd: process.execPath,
      args: [js, 'app/config/openapi.ts'],
      shell: false,
    };
  }
  // Fallback to "tsx" on PATH (may rely on shell resolution).
  const cmd = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
  return { cmd, args: ['app/config/openapi.ts'], shell: true };
};

const findPrettierCli = (root: string): SpawnSpec => {
  // Prefer invoking the JS entry to avoid shell .cmd quirks on Windows.
  const js = path.resolve(
    root,
    'node_modules',
    'prettier',
    'bin',
    'prettier.cjs',
  );
  if (existsSync(js)) {
    return {
      cmd: process.execPath,
      args: [js, '--write', 'app/generated/openapi.json'],
      shell: false,
    };
  }
  // Fallback to "prettier" on PATH.
  const cmd = process.platform === 'win32' ? 'prettier.cmd' : 'prettier';
  return { cmd, args: ['--write', 'app/generated/openapi.json'], shell: true };
};

export const runOpenapi = async (
  root: string,
  opts?: { verbose?: boolean },
): Promise<boolean> => {
  // Detect changes by comparing the pre/post content of app/generated/openapi.json.
  const outFile = path.resolve(root, 'app', 'generated', 'openapi.json');
  let before: string | undefined;
  try {
    if (existsSync(outFile)) before = readFileSync(outFile, 'utf8');
  } catch {
    // ignore read errors; treat as absent
    before = undefined;
  }

  // Build a normalized child env via get-dotenv (static import).
  const env = buildSpawnEnv({} as Record<string, string | undefined>);

  // Step 1: generate the OpenAPI spec.
  const tsx = findTsxCli(root);
  if (opts?.verbose) {
    console.log(`[openapi] ${[tsx.cmd, ...tsx.args].join(' ')}`);
  }

  const genRes = spawnSync(tsx.cmd, tsx.args, {
    cwd: root,
    stdio: 'inherit',
    shell: tsx.shell,
    env,
  });
  if (typeof genRes.status !== 'number' || genRes.status !== 0) {
    const code =
      typeof genRes.status === 'number' ? String(genRes.status) : 'unknown';
    throw new Error(`openapi failed (exit ${code})`);
  }

  // Step 2: format the output with prettier.
  const prettier = findPrettierCli(root);
  if (opts?.verbose) {
    console.log(`[openapi] ${[prettier.cmd, ...prettier.args].join(' ')}`);
  }

  const fmtRes = spawnSync(prettier.cmd, prettier.args, {
    cwd: root,
    stdio: 'inherit',
    shell: prettier.shell,
    env,
  });
  if (typeof fmtRes.status !== 'number' || fmtRes.status !== 0) {
    const code =
      typeof fmtRes.status === 'number' ? String(fmtRes.status) : 'unknown';
    throw new Error(`prettier format failed (exit ${code})`);
  }

  // Determine whether the file content changed
  try {
    if (!existsSync(outFile)) return before !== undefined; // deleted vs existed
    const after = readFileSync(outFile, 'utf8');
    return before === undefined ? true : after !== before;
  } catch {
    // If we cannot read, conservatively report "changed" so callers can refresh.
    return true;
  }
};
