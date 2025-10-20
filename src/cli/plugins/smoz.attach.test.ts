import { describe, expect, it, vi } from 'vitest';

// Spy the delegations
vi.mock('@/src/cli/add', () => ({
  runAdd: vi.fn().mockResolvedValue({ created: [], skipped: [] }),
}));
vi.mock('@/src/cli/init', () => ({
  runInit: vi.fn().mockResolvedValue({
    created: [],
    skipped: [],
    examples: [],
    merged: [],
    installed: 'skipped',
  }),
}));
vi.mock('@/src/cli/register', () => ({
  runRegister: vi.fn().mockResolvedValue({ wrote: [] }),
}));
vi.mock('@/src/cli/openapi', () => ({
  runOpenapi: vi.fn().mockResolvedValue(false),
}));
vi.mock('@/src/cli/dev/index', () => ({
  runDev: vi.fn().mockResolvedValue(undefined) as unknown as (
    root: string,
    opts: unknown,
  ) => Promise<void>,
}));

import { runAdd } from '@/src/cli/add';
import { runDev } from '@/src/cli/dev/index';
import { runInit } from '@/src/cli/init';
import { runOpenapi } from '@/src/cli/openapi';
import { attachSmozCommands } from '@/src/cli/plugins/smoz';
import { runRegister } from '@/src/cli/register';

class FakeHost {
  public commands: Record<string, (argv: string[]) => Promise<void>> = {};
  addCommand(name: string, run: (argv: string[]) => Promise<void>) {
    this.commands[name] = run;
  }
}

describe('attachSmozCommands', () => {
  it('registers init/add/register/openapi/dev and delegates to run*', async () => {
    const host = new FakeHost();
    attachSmozCommands(host as unknown as Record<string, unknown>);

    // Ensure all commands are present
    for (const name of ['init', 'add', 'register', 'openapi', 'dev']) {
      expect(typeof host.commands[name]).toBe('function');
    }

    // init: -t default -y --no-install
    const init = host.commands['init'];
    expect(init).toBeTypeOf('function');
    await init!(['-t', 'default', '-y', '--no-install']);
    expect(runInit).toHaveBeenCalledTimes(1);
    expect(runInit).toHaveBeenCalledWith(
      expect.any(String),
      'default',
      expect.objectContaining({ yes: true, noInstall: true }),
    );

    // add: positional spec
    const add = host.commands['add'];
    expect(add).toBeTypeOf('function');
    await add!(['rest/foo/get']);
    expect(runAdd).toHaveBeenCalledTimes(1);
    expect(runAdd).toHaveBeenCalledWith(expect.any(String), 'rest/foo/get');

    // register: no args
    const reg = host.commands['register'];
    expect(reg).toBeTypeOf('function');
    await reg!([]);
    expect(runRegister).toHaveBeenCalledTimes(1);

    // openapi: -V
    const openapi = host.commands['openapi'];
    expect(openapi).toBeTypeOf('function');
    await openapi!(['-V']);
    expect(runOpenapi).toHaveBeenCalledTimes(1);
    expect(runOpenapi).toHaveBeenCalledWith(expect.any(String), {
      verbose: true,
    });

    // dev: -l inline -p 3000 --no-openapi -V
    const dev = host.commands['dev'];
    expect(dev).toBeTypeOf('function');
    await dev!(['-l', 'inline', '-p', '3000', '--no-openapi', '-V']);
    expect(runDev).toHaveBeenCalledTimes(1);
    expect(runDev).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        register: true,
        openapi: false,
        local: 'inline',
        port: 3000,
        verbose: true,
      }),
    );
  });
});
