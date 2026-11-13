import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { localPackageBin } from '@/src/cli/util/command';

const fakeChild = () =>
  Object.assign(new EventEmitter(), {
    killed: true,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
  });

const spawn = vi.hoisted(() =>
  vi.fn<
    (
      cmd: string,
      args: string[],
      opts: { cwd: string; shell: boolean },
    ) => EventEmitter
  >(),
);
vi.mock('node:child_process', () => ({ spawn }));

import { launchOffline } from '@/src/cli/local/offline';

// Skipped if a serverless above the temp dir (e.g. ~/node_modules) would be found.
const noAmbientServerless =
  localPackageBin(tmpdir(), 'serverless') === undefined;

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

  /** Install serverless v4 (bin `run.js`) under `<repo>/node_modules`. */
  const installServerless = () => {
    const pkgDir = path.join(repo, 'node_modules', 'serverless');
    writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ bin: { serverless: 'run.js', sls: 'run.js' } }),
    );
    writeFile(path.join(pkgDir, 'run.js'));
    return path.join(pkgDir, 'run.js');
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
    const slsJs = installServerless();

    const runner = await launchOffline(service, opts);
    await runner.close();

    expect(spawn).toHaveBeenCalledTimes(1);
    const [cmd, args, spawnOpts] = spawn.mock.calls[0] ?? [];
    expect(cmd).toBe(process.execPath);
    expect(args).toEqual([slsJs, ...offlineArgs]);
    expect(spawnOpts).toMatchObject({ cwd: service, shell: false });
  });

  it.skipIf(!noAmbientServerless)(
    'falls back to serverless on PATH when it is not installed',
    async () => {
      const runner = await launchOffline(service, opts);
      await runner.close();

      expect(spawn).toHaveBeenCalledTimes(1);
      const [cmd, args] = spawn.mock.calls[0] ?? [];
      expect([cmd, ...(args ?? [])].join(' ')).toBe(
        'serverless offline start --stage dev --httpPort 3000',
      );
    },
  );

  it.skipIf(!noAmbientServerless)(
    'looks serverless up again on restart',
    async () => {
      const runner = await launchOffline(service, opts);
      const slsJs = installServerless();
      await runner.restart();
      await runner.close();

      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn.mock.calls[1]?.slice(0, 2)).toEqual([
        process.execPath,
        [slsJs, ...offlineArgs],
      ]);
    },
  );
});
