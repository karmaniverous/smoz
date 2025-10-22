/**
 * SMOZ command plugin (get-dotenv plugin-first host).
 *
 * Registers init/add/register/openapi/dev on a GetDotenvCli instance and
 * delegates to existing implementations. No business logic here.
 */
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';
import { packageDirectorySync } from 'package-directory';

import { runAdd } from '@/src/cli/add';
import { runDev } from '@/src/cli/dev/index';
import { runInit } from '@/src/cli/init';
import { runOpenapi } from '@/src/cli/openapi';
import { runRegister } from '@/src/cli/register';

const repoRoot = (): string => packageDirectorySync() ?? process.cwd();

export const smozPlugin = () =>
  definePlugin({
    id: 'smoz',
    setup(cli) {
      // init
      cli
        .command('init')
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
          const noInstall =
            (opts as { install?: unknown }).install === undefined &&
            opts['noInstall'] !== undefined
              ? Boolean(opts['noInstall'])
              : Boolean(opts['noInstall']);
          const pmRaw = (opts.install as string | undefined) ?? undefined;
          const conflict = (opts.conflict as string | undefined) ?? undefined;
          await runInit(root, template, {
            ...(yes ? { yes } : {}),
            ...(noInstall ? { noInstall } : {}),
            ...(pmRaw ? { install: pmRaw } : {}),
            ...(conflict ? { conflict } : {}),
          });
        });

      // add
      cli
        .command('add')
        .description('Scaffold a function under app/functions')
        .argument('<spec>', 'spec: <eventType>/<segments...>/<method>')
        .action(async (spec: string) => {
          const root = repoRoot();
          if (typeof spec !== 'string' || !spec.trim()) {
            throw new Error('smoz add: missing <spec> (e.g., rest/foo/get)');
          }
          await runAdd(root, spec);
        });

      // register
      cli
        .command('register')
        .description('Generate side-effect register files')
        .action(async () => {
          const root = repoRoot();
          await runRegister(root);
        });

      // openapi
      cli
        .command('openapi')
        .description('Generate OpenAPI document (app/generated/openapi.json)')
        .option('-V, --verbose', 'verbose output')
        .action(async (opts: { verbose?: boolean }) => {
          const root = repoRoot();
          await runOpenapi(root, { verbose: !!opts.verbose });
        });

      // dev
      cli
        .command('dev')
        .description(
          'Dev loop: register/openapi + local backend (inline|offline)',
        )
        .option('-r, --register', 'run register step (default on)')
        .option('-R, --no-register', 'disable register step')
        .option('-o, --openapi', 'run openapi step (default on)')
        .option('-O, --no-openapi', 'disable openapi step')
        .option(
          '-l, --local [mode]',
          'local mode: inline | offline | false (default inline)',
        )
        .option('-s, --stage <name>', 'stage name')
        .option('-p, --port <number>', 'port (0 = random free port)')
        .option('-V, --verbose', 'verbose output')
        .action(
          async (opts: {
            register?: boolean;
            openapi?: boolean;
            local?: boolean | string;
            stage?: string;
            port?: string | number;
            verbose?: boolean;
          }) => {
            const root = repoRoot();

            // register/openapi defaults (on); explicit negations take precedence.
            const register =
              opts.register === true
                ? true
                : (opts as unknown as { noRegister?: boolean }).noRegister
                  ? false
                  : true;
            const openapi =
              opts.openapi === true
                ? true
                : (opts as unknown as { noOpenapi?: boolean }).noOpenapi
                  ? false
                  : true;

            // local mode parsing
            const raw = opts.local;
            let local: false | 'inline' | 'offline' = 'inline';
            if (raw === 'inline' || raw === 'offline') local = raw;
            else if (raw === true) local = 'inline';
            else if (raw === 'false') local = false;

            const port =
              typeof opts.port === 'string'
                ? Number(opts.port)
                : typeof opts.port === 'number'
                  ? opts.port
                  : undefined;

            await runDev(root, {
              register,
              openapi,
              local,
              ...(typeof opts.stage === 'string' ? { stage: opts.stage } : {}),
              ...(typeof port === 'number' ? { port } : {}),
              verbose: !!opts.verbose,
            });
          },
        );
    },
  });
