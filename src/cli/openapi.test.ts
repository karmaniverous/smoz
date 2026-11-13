import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spawnSync = vi.hoisted(() =>
  vi.fn<(cmd: string, args: string[]) => { status: number }>(),
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

  const installTool = (dir: string, pkg: string, exportsMap?: object) => {
    writeFile(
      path.join(dir, 'node_modules', pkg, 'package.json'),
      JSON.stringify({ name: pkg, ...(exportsMap && { exports: exportsMap }) }),
    );
  };

  beforeEach(() => {
    repo = mkdtempSync(path.join(tmpdir(), 'smoz-openapi-'));
    service = path.join(repo, 'packages', 'service');
    writeFile(path.join(repo, 'package.json'), '{}');
    writeFile(path.join(service, 'package.json'), '{}');
    installTool(repo, 'tsx', { './cli': './cli.mjs' });
    writeFile(path.join(repo, 'node_modules', 'tsx', 'cli.mjs'));
    spawnSync.mockReset();
    spawnSync.mockReturnValue({ status: 0 });
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('formats with prettier hoisted to the workspace root', async () => {
    const prettier = path.join(
      repo,
      'node_modules',
      'prettier',
      'bin',
      'prettier.cjs',
    );
    installTool(repo, 'prettier');
    writeFile(prettier);

    await runOpenapi(service);

    expect(spawnSync).toHaveBeenCalledTimes(2);
    expect(spawnSync.mock.calls[1]?.[1]).toEqual([
      prettier,
      '--write',
      'app/generated/openapi.json',
    ]);
  });

  it('fails before formatting when prettier is not installed', async () => {
    await expect(runOpenapi(service)).rejects.toThrow(
      /prettier not found in .* or its parent directories' node_modules/,
    );
    // The document was generated; only the format step was skipped.
    expect(spawnSync).toHaveBeenCalledTimes(1);
  });
});
