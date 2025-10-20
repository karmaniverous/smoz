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
    await host.commands['init'](['-t', 'default', '-y', '--no-install']);
    expect(runInit).toHaveBeenCalledTimes(1);
    {
      const [_root, template, opts] = (runInit as unknown as vi.Mock).mock
        .calls[0]!;
      expect(template).toBe('default');
      expect(opts).toEqual(
        expect.objectContaining({ yes: true, noInstall: true }),
      );
    }

    // add: positional spec
    await host.commands['add'](['rest/foo/get']);
    expect(runAdd).toHaveBeenCalledTimes(1);
    {
      const [_root, spec] = (runAdd as unknown as vi.Mock).mock.calls[0]!;
      expect(spec).toBe('rest/foo/get');
    }

    // register: no args
    await host.commands['register']([]);
    expect(runRegister).toHaveBeenCalledTimes(1);

    // openapi: -V
    await host.commands['openapi'](['-V']);
    expect(runOpenapi).toHaveBeenCalledTimes(1);
    {
      const [_root, opts] = (runOpenapi as unknown as vi.Mock).mock.calls[0]!;
      expect(opts).toEqual({ verbose: true });
    }

    // dev: -l inline -p 3000 --no-openapi -V
    await host.commands['dev']([
      '-l',
      'inline',
      '-p',
      '3000',
      '--no-openapi',
      '-V',
    ]);
    expect(runDev).toHaveBeenCalledTimes(1);
    {
      const [_root, opts] = (runDev as unknown as vi.Mock).mock.calls[0]!;
      expect(opts).toEqual(
        expect.objectContaining({
          register: true,
          openapi: false,
          local: 'inline',
          port: 3000,
          verbose: true,
        }),
      );
    }
  });
});
