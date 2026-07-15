/**
 * SMOZ CLI — plugin-first host built on get-dotenv.
 *
 * - Create the supported GetDotenv CLI runner so root options, resolution hooks,
 *   and plugin installation stay aligned with the get-dotenv host API.
 * - Install included plugins (cmd/batch/aws) and the SMOZ command plugin
 *   (init/add/register/openapi/dev).
 */
import { createCli } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { smozPlugin } from '@/src/cli/plugins/smoz';

const main = createCli({
  alias: 'smoz',
  compose: (cli) => {
    const setupResult = smozPlugin().setup(cli);

    if (setupResult !== undefined) {
      throw new Error('smozPlugin root setup must remain synchronous.');
    }

    return cli
      .use(awsPlugin())
      .use(
        cmdPlugin({
          asDefault: true,
          optionAlias: '-c, --cmd <command...>',
        }),
      )
      .use(batchPlugin());
  },
});

void main();
