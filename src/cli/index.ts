/**
 * SMOZ CLI — plugin-first host built on get-dotenv.
 *
 * - Build a GetDotenvCli host, install included plugins (cmd/batch/aws),
 *   and install the SMOZ command plugin (init/add/register/openapi/dev).
 * - Resolve dotenv context once, then parse argv.
 */
import { createCli } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { smozPlugin } from '@/src/cli/plugins/smoz';

const main = async (): Promise<void> => {
  const run = createCli({
    alias: 'smoz',
    branding: {
      importMetaUrl: import.meta.url,
      description: 'SMOZ CLI',
    },
    compose: (p) =>
      p
        .use(smozPlugin())
        .use(awsPlugin())
        .use(
          cmdPlugin({
            asDefault: true,
            optionAlias: '-c, --cmd <command...>',
          }),
        )
        .use(batchPlugin()),
  });

  await run(process.argv.slice(2));
};

void main();
