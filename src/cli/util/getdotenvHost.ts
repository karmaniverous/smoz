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
    const seenKeys = Object.keys(mod ?? {});
    const makeOpts = () =>
      typeof branding === 'string' ? { argv, branding } : { argv };

    // Prefer a real host: createCli({ branding }).run(argv)
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

    // Named runCli({ argv, branding? })
    if (typeof (mod as { runCli?: unknown }).runCli === 'function') {
      await (
        mod as unknown as {
          runCli: (opts: {
            argv: string[];
            branding?: string;
          }) => Promise<void>;
        }
      ).runCli(makeOpts());
      return;
    }

    // Named run({ argv, branding? })
    if (typeof (mod as { run?: unknown }).run === 'function') {
      await (
        mod as unknown as {
          run: (opts: { argv: string[]; branding?: string }) => Promise<void>;
        }
      ).run(makeOpts());
      return;
    }

    // Default export is a function: default({ argv, branding? })
    if (typeof (mod as { default?: unknown }).default === 'function') {
      await (
        mod as unknown as {
          default: (opts: {
            argv: string[];
            branding?: string;
          }) => Promise<void>;
        }
      ).default(makeOpts());
      return;
    }

    // default.run({ argv, branding? })
    if (
      typeof (mod as { default?: unknown }).default === 'object' &&
      mod.default !== null &&
      typeof (mod.default as { run?: unknown }).run === 'function'
    ) {
      await (
        mod.default as unknown as {
          run: (opts: { argv: string[]; branding?: string }) => Promise<void>;
        }
      ).run(makeOpts());
      return;
    }

    // cli.run({ argv, branding? })
    if (
      typeof (mod as { cli?: unknown }).cli === 'object' &&
      mod.cli !== null &&
      typeof (mod.cli as { run?: unknown }).run === 'function'
    ) {
      await (
        mod.cli as unknown as {
          run: (opts: { argv: string[]; branding?: string }) => Promise<void>;
        }
      ).run(makeOpts());
      return;
    }
  } catch {
    // ignore; fall through to error
  }
  throw new Error(
    'get-dotenv host is not available or did not expose a known entry point (probed: createCli, runCli, run, default function, default.run, cli.run)',
  );
};
