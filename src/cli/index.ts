/**
 * SMOZ CLI — plugin-first host built on get-dotenv.
 *
 * - Build a GetDotenvCli host, install included plugins (cmd/batch/aws),
 *   and install the SMOZ command plugin (init/add/register/openapi/dev).
 * - Resolve dotenv context once, then parse argv.
 */
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { smozPlugin } from '@/src/cli/plugins/smoz';

const main = async (): Promise<void> => {
  const cli = new GetDotenvCli('smoz');
  try {
    await cli.brand({
      importMetaUrl: import.meta.url,
      description: 'SMOZ CLI',
    });
  } catch {
    // Branding is best-effort.
  }

  // Install included plugins and the SMOZ command plugin.
  cli.use(
    cmdPlugin({
      asDefault: true,
      optionAlias: '-c, --cmd <command...>',
    }),
  );
  cli.use(batchPlugin());
  // Always present (downstream sub-plugins will rely on AWS presence).
  cli.use(awsPlugin());
  cli.use(smozPlugin());

  // Resolve dotenv context once per invocation, then parse argv.
  await (
    cli as unknown as { resolveAndLoad: () => Promise<void> }
  ).resolveAndLoad();
  await (cli as unknown as { parseAsync: () => Promise<void> }).parseAsync();
};

void main();
