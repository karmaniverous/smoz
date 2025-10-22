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

  await cli.brand({
    importMetaUrl: import.meta.url,
    description: 'SMOZ CLI',
  });

  cli
    .attachRootOptions()
    .use(smozPlugin())
    .use(awsPlugin())
    .use(
      cmdPlugin({
        asDefault: true,
        optionAlias: '-c, --cmd <command...>',
      }),
    )
    .use(batchPlugin())
    .passOptions();

  await cli.parseAsync();
};

void main();
