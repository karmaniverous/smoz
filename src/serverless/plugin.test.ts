import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { spawnSync } = vi.hoisted(() => ({ spawnSync: vi.fn() }));
vi.mock('node:child_process', () => ({ spawnSync }));

import SmozRegisterPlugin from '@/src/serverless/plugin';

const hookNames = [
  'before:package:initialize',
  'before:deploy:function:initialize',
  'before:deploy:deploy',
] as const;

const runHook = (name: (typeof hookNames)[number]): void => {
  const hook = new SmozRegisterPlugin().hooks[name];
  if (!hook) throw new Error(`missing hook ${name}`);
  hook();
};

describe('serverless/plugin', () => {
  afterEach(() => {
    spawnSync.mockReset();
  });

  it('registers expected hooks', () => {
    const { hooks } = new SmozRegisterPlugin();
    expect(Object.keys(hooks).sort()).toEqual([...hookNames].sort());
  });

  it.each(hookNames)(
    '%s runs `smoz register` with the packaged CLI',
    (name) => {
      spawnSync.mockReturnValue({ status: 0 });
      runHook(name);
      expect(spawnSync).toHaveBeenCalledWith(
        process.execPath,
        [path.resolve(__dirname, '../cli/index.cjs'), 'register'],
        { stdio: 'inherit', shell: false },
      );
    },
  );

  it('throws with the exit code when register fails', () => {
    spawnSync.mockReturnValue({ status: 2 });
    expect(() => {
      runHook('before:package:initialize');
    }).toThrow('smoz register failed (exit code 2)');
  });

  it('reports an unknown exit code when register is killed', () => {
    spawnSync.mockReturnValue({ status: null });
    expect(() => {
      runHook('before:deploy:deploy');
    }).toThrow('smoz register failed (exit code unknown)');
  });
});
