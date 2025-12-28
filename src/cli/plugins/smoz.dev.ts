/**
 * SMOZ CLI: dev plugin (root-mounted).
 *
 * Thin adapter: maps Commander options -> runDev service.
 */
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { type LocalMode, runDev } from '@/src/cli/dev';
import { repoRoot } from '@/src/cli/plugins/smoz.root';

const parseLocalMode = (v: unknown): LocalMode => {
  if (v === false) return false;
  if (typeof v !== 'string') return 'inline';
  const s = v.trim().toLowerCase();
  if (s === 'false' || s === 'off' || s === 'none' || s === '0') return false;
  if (s === 'offline') return 'offline';
  return 'inline';
};

const parsePort = (value: string): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 65535) {
    throw new Error('Invalid --port; expected an integer 0..65535.');
  }
  return n;
};

export const smozDevPlugin = () =>
  definePlugin({
    ns: 'dev',
    setup(cli) {
      cli
        .description(
          'Watch app/functions/** and keep registers + OpenAPI fresh (optionally run local HTTP)',
        )
        // Default: enabled; allow explicit disabling.
        .option('-R, --no-register', 'disable register step')
        .option('-O, --no-openapi', 'disable openapi step')
        .option('-l, --local [mode]', 'inline|offline|false', 'inline')
        .option('-s, --stage <name>', 'stage name')
        .option('-p, --port <n>', 'port (0=random)', parsePort, 0)
        .option('-V, --verbose', 'verbose logging')
        .action(async (opts: Record<string, unknown>) => {
          const root = repoRoot();

          const local = parseLocalMode(opts.local);
          const stage =
            typeof opts.stage === 'string' && opts.stage.trim().length > 0
              ? opts.stage.trim()
              : undefined;
          const port = typeof opts.port === 'number' ? opts.port : 0;
          const verbose = Boolean(opts.verbose);

          // Commander sets boolean option properties to true by default for --no-*
          const register = opts.register !== false;
          const openapi = opts.openapi !== false;

          await runDev(root, {
            register,
            openapi,
            local,
            ...(stage ? { stage } : {}),
            port,
            verbose,
          });
        });
    },
  });
