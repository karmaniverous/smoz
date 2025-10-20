import { describe, expect, it, vi } from 'vitest';

describe('host opt-in: createCli preferred, adapter fallback', () => {
  it('prefers createCli host when available', async () => {
    vi.resetModules();
    // Spy adapter — should NOT be used in this branch.
    const runAdapter = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@/src/cli/util/getdotenvHost', () => ({
      runGetDotenvHost: runAdapter,
    }));
    // Mock get-dotenv with createCli that exposes a run()
    const runHost = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@karmaniverous/get-dotenv', () => ({
      createCli: () => ({ run: runHost }),
    }));
    const mod = (await import('@/src/cli/host/index')) as {
      runWithHost: (argv: string[], branding: string) => Promise<boolean>;
    };
    const ok = await mod.runWithHost(['--help'], 'smoz v0.0.0');
    expect(ok).toBe(true);
    expect(runHost).toHaveBeenCalledTimes(1);
    expect(runHost).toHaveBeenCalledWith(['--help']);
    expect(runAdapter).not.toHaveBeenCalled();
  });

  it('falls back to adapter when createCli is absent', async () => {
    vi.resetModules();
    const runAdapter = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@/src/cli/util/getdotenvHost', () => ({
      runGetDotenvHost: runAdapter,
    }));
    // No createCli in this branch
    // Provide a mock with an explicit, non-function createCli to avoid
    // “missing export” complaints from the mock layer and exercise the
    // adapter fallback path.
    vi.doMock('@karmaniverous/get-dotenv', () => ({ createCli: undefined }));
    const mod = (await import('@/src/cli/host/index')) as {
      runWithHost: (argv: string[], branding: string) => Promise<boolean>;
    };
    const ok = await mod.runWithHost(['register'], 'smoz v0.0.0');
    expect(ok).toBe(true);
    expect(runAdapter).toHaveBeenCalledTimes(1);
    expect(runAdapter).toHaveBeenCalledWith(['register'], 'smoz v0.0.0');
  });
});
