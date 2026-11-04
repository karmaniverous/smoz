import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { pathCommand } from '@/src/cli/util/command';

// Mock child_process before importing the module under test (PATH probe).
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}));

describe('dev.inline: resolveTsxCommand', async () => {
  const { resolveTsxCommand } = await import('@/src/cli/dev/index');
  const cp = (await import('node:child_process')) as unknown as {
    spawnSync: ReturnType<typeof vi.fn>;
  };

  const noTsxRoot = path.resolve('/', 'tmp', 'smoz-no-tsx-here');
  const entry = path.resolve(
    '/',
    'tmp',
    'sandbox',
    'inline.server',
    'index.ts',
  );

  it("runs the project's tsx CLI under the current node, without a shell", () => {
    cp.spawnSync.mockReset();
    const root = process.cwd();
    const cli = createRequire(path.resolve(root, 'package.json')).resolve(
      'tsx/cli',
    );
    expect(resolveTsxCommand(root, entry)).toEqual({
      cmd: process.execPath,
      args: [cli, entry],
      shell: false,
    });
    expect(cp.spawnSync).not.toHaveBeenCalled();
  });

  it('falls back to tsx on PATH, never passing args with shell: true', () => {
    cp.spawnSync.mockReset();
    cp.spawnSync.mockReturnValue({ status: 0 });
    expect(resolveTsxCommand(noTsxRoot, entry)).toEqual(
      pathCommand('tsx', [entry]),
    );
    const [cmd, args, opts] = cp.spawnSync.mock.calls[0] as [
      string,
      string[],
      { shell: boolean },
    ];
    expect({ cmd, args, shell: opts.shell }).toEqual(
      pathCommand('tsx', ['--version']),
    );
  });

  it('throws a hard error when tsx is not available locally or on PATH', () => {
    cp.spawnSync.mockReset();
    cp.spawnSync.mockReturnValue({ status: 127 });
    expect(() => resolveTsxCommand(noTsxRoot, entry)).toThrow(
      /Inline requires tsx/i,
    );
  });
});
