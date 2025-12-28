/* REQUIREMENTS ADDRESSED (TEST)
- Validate SMOZ CLI mounts the DynamoDB get-dotenv plugin under `aws` so the
  command surface includes:
    - `smoz aws dynamodb ...`
    - `smoz aws dynamodb local start|stop|status`
- Keep this test non-invasive: use `--help` only (no external commands run).
*/
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const resolveCliInvocation = (): {
  cmd: string;
  argsPrefix: string[];
  shell: boolean;
} => {
  const root = process.cwd();

  // Prefer the compiled CJS CLI if present; it matches production invocation
  // semantics exactly (argv shape).
  const compiled = path.resolve(root, 'dist', 'cli', 'index.cjs');
  if (existsSync(compiled)) {
    return { cmd: process.execPath, argsPrefix: [compiled], shell: false };
  }

  // Fall back to author-time TS execution. IMPORTANT: invoke via `tsx <entry>`
  // (not `node tsx/cli.js <entry>`) so `process.argv` is `[node, entry, ...]`
  // and `src/cli/index.ts` can safely do `process.argv.slice(2)`.
  const entry = path.resolve(root, 'src', 'cli', 'index.ts');
  const localBin = path.resolve(
    root,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
  );
  if (existsSync(localBin)) {
    return {
      cmd: localBin,
      argsPrefix: [entry],
      shell: process.platform === 'win32',
    };
  }

  // Final fallback: PATH resolution (CI or unusual installs).
  return {
    cmd: process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
    argsPrefix: [entry],
    shell: true,
  };
};

const runHelp = (args: string[]) => {
  const { cmd, argsPrefix, shell } = resolveCliInvocation();

  const res = spawnSync(cmd, [...argsPrefix, ...args], {
    cwd: process.cwd(),
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: {
      ...process.env,
      // Ensure TSX can resolve TS config paths when running the TS entry.
      TSX_TSCONFIG_PATHS: '1',
      NO_COLOR: '1',
      FORCE_COLOR: '0',
    },
  });

  const stdout = typeof res.stdout === 'string' ? res.stdout : '';
  const stderr = typeof res.stderr === 'string' ? res.stderr : '';
  const combined = `${stdout}\n${stderr}`.trim();
  return { status: res.status, combined, stdout, stderr };
};

describe('CLI composition: aws/dynamodb', () => {
  it('exposes aws dynamodb local subcommands', () => {
    const ddb = runHelp(['aws', 'dynamodb', '--help']);
    expect(ddb.status).toBe(0);
    expect((ddb.combined || ddb.stdout || ddb.stderr).toLowerCase()).toContain(
      'local',
    );

    const local = runHelp(['aws', 'dynamodb', 'local', '--help']);
    expect(local.status).toBe(0);
    const text = (local.combined || local.stdout || local.stderr).toLowerCase();
    expect(text).toContain('start');
    expect(text).toContain('stop');
    expect(text).toContain('status');
  });
});
