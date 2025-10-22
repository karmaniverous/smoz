/* OpenAPI one-shot runner: spawn the project-local OpenAPI script via tsx.
 * - Mirrors the npm script: tsx app/config/openapi && prettier (project-local script already formats).
 * - Keeps CLI responsibilities minimal; errors bubble via non-zero exit.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildSpawnEnv } from '@karmaniverous/get-dotenv';

const findTsxCli = (
  root: string,
): { cmd: string; args: string[]; shell: boolean } => {
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

  const { cmd, args, shell } = findTsxCli(root);
  if (opts?.verbose) {
    console.log(`[openapi] ${[cmd, ...args].join(' ')}`);
  }

  // Build a normalized child env via get-dotenv (static import).
  const env = buildSpawnEnv({} as Record<string, string | undefined>);

  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell,
    env,
  });
  if (typeof res.status !== 'number' || res.status !== 0) {
    const code =
      typeof res.status === 'number' ? String(res.status) : 'unknown';
    throw new Error(`openapi failed (exit ${code})`);
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
