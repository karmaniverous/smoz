/**
 * SMOZ CLI — executable entrypoint.
 *
 * - Build a GetDotenvCli host, install included plugins (cmd/batch/aws),
 *   and install the SMOZ command plugins (init/add/register/openapi/dev).
 * - Resolve dotenv context once, then parse argv.
 *
 * Keep this file side-effectful (it runs immediately). Import-safe exports
 * live in `src/cli/index.ts` (published as `@karmaniverous/smoz/cli`).
 */
import { secretsPlugin } from '@karmaniverous/aws-secrets-manager-tools';
import { dynamodbPlugin } from '@karmaniverous/entity-client-dynamodb/get-dotenv';
import { createCli } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { useSmozPlugins } from '@/src/cli/plugins/smoz';

await createCli({
  alias: 'smoz',
  branding: 'SMOZ CLI',
  compose: (p) =>
    useSmozPlugins(p)
      .use(awsPlugin().use(dynamodbPlugin()).use(secretsPlugin()))
      .use(
        cmdPlugin({
          asDefault: true,
          optionAlias: '-c, --cmd <command...>',
        }),
      )
      .use(batchPlugin()),
})();
