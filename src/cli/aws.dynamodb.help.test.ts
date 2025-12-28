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

const resolveTsx = (): {
  cmd: string;
  argsPrefix: string[];
  shell: boolean;
} => {
  const root = process.cwd();
  const js = path.resolve(root, 'node_modules', 'tsx', 'dist', 'cli.js');
  if (existsSync(js)) {
    return { cmd: process.execPath, argsPrefix: [js], shell: false };
  }
  // Fallback: PATH resolution (CI or unusual installs).
  const cmd = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
  return { cmd, argsPrefix: [], shell: true };
};

const runHelp = (args: string[]) => {
  const entry = path.resolve(process.cwd(), 'src', 'cli', 'index.ts');
  const { cmd, argsPrefix, shell } = resolveTsx();

  const res = spawnSync(cmd, [...argsPrefix, entry, ...args], {
    cwd: process.cwd(),
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: {
      ...process.env,
      NO_COLOR: '1',
      FORCE_COLOR: '0',
    },
  });

  const combined = `${res.stdout}\n${res.stderr}`.trim();
  return { status: res.status, combined };
};

describe('CLI composition: aws/dynamodb', () => {
  it('exposes aws dynamodb local subcommands', () => {
    const ddb = runHelp(['aws', 'dynamodb', '--help']);
    expect(ddb.status).toBe(0);
    expect(ddb.combined.toLowerCase()).toContain('local');

    const local = runHelp(['aws', 'dynamodb', 'local', '--help']);
    expect(local.status).toBe(0);
    const text = local.combined.toLowerCase();
    expect(text).toContain('start');
    expect(text).toContain('stop');
    expect(text).toContain('status');
  });
});
