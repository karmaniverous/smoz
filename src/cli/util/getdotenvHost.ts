/**
 * Adapter that invokes the get-dotenv plugin-first host for the given argv.
 *
 * It probes a few common entry points to avoid hard coupling to a specific
 * symbol name. This lets us delegate cmd/batch now and wire deeper integration
 * later without breaking the current CLI surface.
 */
export const runGetDotenvHost = async (
  argv: string[],
  branding?: string,
): Promise<void> => {
  try {
    // Dynamic import with lenient shape probing; keep no-unsafe isolated here.

    const mod = (await import('@karmaniverous/get-dotenv')) as Record<
      string,
      unknown
    >;
    // Prefer a canonical runCli(argv, branding?) if present

    if (typeof (mod as { runCli?: unknown }).runCli === 'function') {
      const opts = ((): { argv: string[]; branding?: string } =>
        typeof branding === 'string' ? { argv, branding } : { argv })();
      await (
        mod as unknown as {
          runCli: (opts: {
            argv: string[];
            branding?: string;
          }) => Promise<void>;
        }
      ).runCli(opts);
      return;
    }
    // Fallback: run({ argv, branding? })

    if (typeof (mod as { run?: unknown }).run === 'function') {
      const opts = ((): { argv: string[]; branding?: string } =>
        typeof branding === 'string' ? { argv, branding } : { argv })();
      await (
        mod as unknown as {
          run: (opts: { argv: string[]; branding?: string }) => Promise<void>;
        }
      ).run(opts);
      return;
    }
    // Fallback: createCli({ branding? }).run(argv)

    if (typeof (mod as { createCli?: unknown }).createCli === 'function') {
      const cliFactory = mod as unknown as {
        createCli: (opts: { branding?: string }) => {
          run: (a: string[]) => Promise<void>;
        };
      };
      const host =
        typeof branding === 'string'
          ? cliFactory.createCli({ branding })
          : cliFactory.createCli({});
      await host.run(argv);
      return;
    }
  } catch {
    // ignore; fall through to error
  }
  throw new Error(
    'get-dotenv host is not available or did not expose a known entry point',
  );
};
