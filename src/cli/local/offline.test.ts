import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakeChild = () =>
  Object.assign(new EventEmitter(), {
    killed: true,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
  });

const spawn = vi.hoisted(() =>
  vi.fn<
    (cmd: string, args: string[], opts: { shell: boolean }) => EventEmitter
  >(),
);
vi.mock('node:child_process', () => ({ spawn }));

import { launchOffline } from '@/src/cli/local/offline';

describe('cli/local/offline.launchOffline', () => {
  // An npm workspaces layout: the service is <repo>/packages/service.
  let repo: string;
  let service: string;
  const opts = { stage: 'dev', port: 3000, verbose: false };
  const offlineArgs = [
    'offline',
    'start',
    '--stage',
    'dev',
    '--httpPort',
    '3000',
  ];

  const writeFile = (file: string, content = '') => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };

  beforeEach(() => {
    repo = mkdtempSync(path.join(tmpdir(), 'smoz-offline-'));
    service = path.join(repo, 'packages', 'service');
    writeFile(path.join(repo, 'package.json'), '{}');
    writeFile(path.join(service, 'package.json'), '{}');
    spawn.mockReset();
    spawn.mockImplementation(fakeChild);
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('runs serverless hoisted to the workspace root with node', async () => {
    const slsJs = path.join(
      repo,
      'node_modules',
      'serverless',
      'bin',
      'serverless.js',
    );
    writeFile(slsJs);

    const runner = await launchOffline(service, opts);
    await runner.close();

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn.mock.calls[0]?.slice(0, 2)).toEqual([
      process.execPath,
      [slsJs, ...offlineArgs],
    ]);
    expect(spawn.mock.calls[0]?.[2].shell).toBe(false);
  });

  it('falls back to serverless on PATH when it is not installed', async () => {
    const runner = await launchOffline(service, opts);
    await runner.close();

    expect(spawn).toHaveBeenCalledTimes(1);
    const [cmd, args] = spawn.mock.calls[0] ?? [];
    expect([cmd, ...(args ?? [])].join(' ')).toMatch(
      /^serverless offline start --stage dev --httpPort 3000$/,
    );
  });
});
