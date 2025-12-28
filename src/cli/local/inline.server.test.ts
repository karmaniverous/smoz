import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Wait for the inline server to print its listening port.
 * Resolves with the selected port (number) or rejects on timeout/early exit.
 */
const waitForListening = async (
  child: ChildProcess,
  timeoutMs = 30000,
): Promise<number> => {
  return await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      // Best-effort cleanup to avoid a stray child if the test times out.
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      reject(new Error('Timed out waiting for inline server to start'));
    }, timeoutMs);

    let buf = '';
    const onData = (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      const m = buf.match(/listening on http:\/\/localhost:(\d+)/i);
      if (m) {
        clearTimeout(timer);
        child.stdout?.off('data', onData);
        resolve(Number(m[1]));
      }
    };
    child.stdout?.on('data', onData);

    child.once('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Inline server spawn error: ${err.message}`));
    });

    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Inline server exited early (code ${String(code)})`));
    });
  });
};

/**
 * Launch the inline server via tsx.
 * - Prefer the project-local JS entry (node node_modules/tsx/dist/cli.js <entry>)
 * - Fallback to PATH resolution of "tsx" (or "tsx.cmd" on Windows)
 */
const startInline = async (): Promise<{
  port: number;
  close: () => Promise<void>;
}> => {
  const repoRoot = process.cwd();
  const tsxCli = path.resolve(
    repoRoot,
    'node_modules',
    'tsx',
    'dist',
    'cli.js',
  );
  const entry = path.resolve(
    repoRoot,
    'src',
    'cli',
    'local',
    'inline.server',
    'index.ts',
  );

  const args: string[] = [];
  let cmd: string;
  let shell = false;
  if (existsSync(tsxCli)) {
    // Prefer Node + JS CLI to avoid .cmd quirks on Windows
    cmd = process.execPath;
    args.push(tsxCli, entry);
  } else {
    cmd = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
    args.push(entry);
    shell = true;
  }

  const child: ChildProcess = spawn(cmd, args, {
    cwd: repoRoot,
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Use OS-assigned free port; the server logs the resolved port.
      SMOZ_PORT: '0',
      // Verbose server output helps with diagnostics in CI.
      SMOZ_VERBOSE: '1',
      // Stage visible to the inline adapter (route table print).
      SMOZ_STAGE: 'dev',
    },
  });

  // Prefix stderr for easier triage in CI logs
  child.stderr?.on('data', (d: Buffer) => {
    const t = d.toString('utf8');
    process.stderr.write(`[inline.test] ${t}`);
  });

  const port = await waitForListening(child, 30000);

  const close = async () => {
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null) {
        resolve();
        return;
      }
      child.once('exit', () => {
        resolve();
      });
      child.kill('SIGTERM');
      // Safety timeout to avoid hanging in CI
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  };

  return { port, close };
};

describe('inline server (integration)', () => {
  let port = 0;
  let shutdown: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    // Seed required env for the wrapped HTTP handler (env parsing):
    // REGION, SERVICE_NAME, STAGE are required by the app’s env exposure.
    if (!process.env.SERVICE_NAME) process.env.SERVICE_NAME = 'testService';
    if (!process.env.REGION) process.env.REGION = 'us-east-1';
    if (!process.env.STAGE) process.env.STAGE = 'dev';

    const { port: p, close } = await startInline();
    port = p;
    shutdown = close;
  }, 40000);
  afterAll(async () => {
    if (shutdown) await shutdown();
  });

  it('GET /openapi returns 200 JSON with openapi 3.1.0', async () => {
    const res = await fetch(`http://localhost:${String(port)}/openapi`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct.toLowerCase()).toContain('application/json');
    const body = (await res.json()) as { openapi?: string };
    expect(body.openapi).toBe('3.1.0');
  });

  it('HEAD /openapi returns 200 with Content-Type', async () => {
    const res = await fetch(`http://localhost:${String(port)}/openapi`, {
      method: 'HEAD',
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct.toLowerCase()).toContain('application/json');
  });

  it('GET /no-such returns 404 Not Found', async () => {
    const res = await fetch(`http://localhost:${String(port)}/no-such`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(404);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct.toLowerCase()).toContain('application/json');
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('Not Found');
  });
});
