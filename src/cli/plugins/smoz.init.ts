import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { runInit } from '@/src/cli/init';
import { repoRoot } from '@/src/cli/plugins/smoz.root';

export const smozInitPlugin = () =>
  definePlugin({
    ns: 'init',
    setup(cli) {
      cli
        .description('Scaffold a new SMOZ app from a template')
        .option('-t, --template <name>', 'template name', 'default')
        .option('-y, --yes', 'assume “example” on conflicts')
        .option('--no-install', 'do not install dependencies')
        .option(
          '--install <pm>',
          'explicit package manager (npm|pnpm|yarn|bun)',
        )
        .option('--conflict <policy>', 'overwrite|example|skip|ask')
        .action(async (opts: Record<string, unknown>) => {
          const root = repoRoot();
          const template =
            typeof opts.template === 'string' ? opts.template : 'default';

          const yes = Boolean(opts.yes);
          const installOpt = (opts as { install?: unknown }).install;
          const noInstall = installOpt === false;
          const pmRaw = typeof installOpt === 'string' ? installOpt : undefined;
          const conflict = (opts.conflict as string | undefined) ?? undefined;

          await runInit(root, template, {
            ...(yes ? { yes } : {}),
            ...(noInstall ? { noInstall } : {}),
            ...(pmRaw ? { install: pmRaw } : {}),
            ...(conflict ? { conflict } : {}),
          });
        });
    },
  });
