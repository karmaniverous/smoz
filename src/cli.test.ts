/* REQUIREMENTS ADDRESSED (TEST)
- `@karmaniverous/smoz/cli` exports `smozPlugin` (get-dotenv Decision 24), and
  importing it doesn't run the CLI.
- A host CLI that mounts `smozPlugin()` gets smoz's commands under `smoz`
  (`vc smoz openapi`).
*/
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { describe, expect, it, vi } from 'vitest';

describe('@karmaniverous/smoz/cli', () => {
  it('exports smozPlugin and has no side effects on import', async () => {
    const write = vi.spyOn(process.stdout, 'write');
    const exit = vi.spyOn(process, 'exit');
    try {
      const entry = await import('@/src/cli');
      expect(Object.keys(entry)).toEqual(['smozPlugin']);
      expect(write).not.toHaveBeenCalled();
      expect(exit).not.toHaveBeenCalled();
    } finally {
      write.mockRestore();
      exit.mockRestore();
    }
  });

  it('mounts smoz commands under the smoz namespace of a host', async () => {
    const { smozPlugin } = await import('@/src/cli');
    const cli = new GetDotenvCli('vc', { importMetaUrl: import.meta.url });
    cli.use(smozPlugin());
    await cli.install();
    const smoz = cli.commands.find((c) => c.name() === 'smoz');
    expect(smoz?.commands.map((c) => c.name())).toEqual([
      'init',
      'add',
      'register',
      'openapi',
      'dev',
    ]);
  });
});
