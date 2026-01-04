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

  // Determinism: tests must not depend on build artifacts (dist/ may be absent
  // or stale). Always run the TS entry via tsx, preferring the project-local
  // JS CLI to avoid shell/.cmd quirks.
  const entry = path.resolve(root, 'src', 'cli', 'bin.ts');
  const tsxJs = path.resolve(root, 'node_modules', 'tsx', 'dist', 'cli.js');
  if (existsSync(tsxJs)) {
    return { cmd: process.execPath, argsPrefix: [tsxJs, entry], shell: false };
  }
  // Fallback: PATH resolution (CI or unusual installs).
  return {
    cmd: process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
    argsPrefix: [entry],
    shell: true,
  };
};

const runHelp = (args: string[]) => {
  const { cmd, argsPrefix, shell } = resolveCliInvocation();
  const fullArgs = [...argsPrefix, ...args];
  const invoked = [cmd, ...fullArgs].join(' ');

  const res = spawnSync(cmd, fullArgs, {
    cwd: process.cwd(),
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    // Guard: spawning tsx + type-loading can be slow on Windows CI.
    // If this trips, the diagnostic returned below will show that the child
    // timed out rather than silently hanging the test process.
    timeout: 20000,
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
  const errorLine = res.error
    ? `${res.error.name}: ${res.error.message}`
    : undefined;
  const diagnostic = [
    `invoked: ${invoked}`,
    `status: ${String(res.status)} signal: ${String(res.signal)}`,
    ...(errorLine ? [`error: ${errorLine}`] : []),
    stdout.trim().length
      ? `--- stdout ---\n${stdout.trimEnd()}`
      : '--- stdout ---\n(none)',
    stderr.trim().length
      ? `--- stderr ---\n${stderr.trimEnd()}`
      : '--- stderr ---\n(none)',
  ].join('\n');

  return { status: res.status, combined, stdout, stderr, invoked, diagnostic };
};

describe('CLI composition: aws/dynamodb', () => {
  it('exposes aws dynamodb local subcommands', () => {
    const ddb = runHelp(['aws', 'dynamodb', '--help']);
    expect(ddb.status, ddb.diagnostic).toBe(0);
    const ddbText = (ddb.combined || ddb.stdout || ddb.stderr).toLowerCase();
    expect(ddbText, ddb.diagnostic).toContain('local');

    const local = runHelp(['aws', 'dynamodb', 'local', '--help']);
    expect(local.status, local.diagnostic).toBe(0);
    const text = (local.combined || local.stdout || local.stderr).toLowerCase();
    expect(text, local.diagnostic).toContain('start');
    expect(text, local.diagnostic).toContain('stop');
    expect(text, local.diagnostic).toContain('status');
  }, 20000);
});
