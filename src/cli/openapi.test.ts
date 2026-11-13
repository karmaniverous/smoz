import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { localPackageBin } from '@/src/cli/util/command';

const spawnSync = vi.hoisted(() =>
  vi.fn<
    (
      cmd: string,
      args: string[],
      opts: { cwd: string; shell: boolean },
    ) => {
      status: number;
    }
  >(),
);
vi.mock('node:child_process', () => ({ spawnSync }));

import { runOpenapi } from '@/src/cli/openapi';

describe('cli/openapi.runOpenapi', () => {
  // An npm workspaces layout: the service is <repo>/packages/service and npm
  // hoisted its dev tools to <repo>/node_modules.
  let repo: string;
  let service: string;

  const writeFile = (file: string, content = '') => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };

  const writeJson = (file: string, value: object) => {
    writeFile(file, JSON.stringify(value));
  };

  beforeEach(() => {
    repo = mkdtempSync(path.join(tmpdir(), 'smoz-openapi-'));
    service = path.join(repo, 'packages', 'service');
    writeFile(path.join(repo, 'package.json'), '{}');
    writeFile(path.join(service, 'package.json'), '{}');
    // tsx is resolved through its exports map.
    writeJson(path.join(repo, 'node_modules', 'tsx', 'package.json'), {
      name: 'tsx',
      exports: { './cli': './cli.mjs' },
    });
    writeFile(path.join(repo, 'node_modules', 'tsx', 'cli.mjs'));
    spawnSync.mockReset();
    spawnSync.mockReturnValue({ status: 0 });
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('formats with prettier hoisted to the workspace root', async () => {
    const pkgDir = path.join(repo, 'node_modules', 'prettier');
    writeJson(path.join(pkgDir, 'package.json'), {
      bin: './bin/prettier.cjs',
    });
    const prettier = path.join(pkgDir, 'bin', 'prettier.cjs');
    writeFile(prettier);

    await runOpenapi(service);

    expect(spawnSync).toHaveBeenCalledTimes(2);
    const [cmd, args, opts] = spawnSync.mock.calls[1] ?? [];
    expect(cmd).toBe(process.execPath);
    expect(args).toEqual([prettier, '--write', 'app/generated/openapi.json']);
    expect(opts).toMatchObject({ cwd: service, shell: false });
  });

  // Skipped if a prettier above the temp dir (e.g. ~/node_modules) would be found.
  it.skipIf(localPackageBin(tmpdir(), 'prettier') !== undefined)(
    'fails before formatting when prettier is not installed',
    async () => {
      await expect(runOpenapi(service)).rejects.toThrow(
        /prettier not found in .* or its parent directories' node_modules/,
      );
      // The document was generated; only the format step was skipped.
      expect(spawnSync).toHaveBeenCalledTimes(1);
    },
  );
});
