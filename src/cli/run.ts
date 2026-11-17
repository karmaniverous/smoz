/**
 * SMOZ CLI host: a get-dotenv CLI with smoz's commands (init, add, register,
 * openapi, dev) at its root, plus get-dotenv's aws, cmd and batch plugins.
 * Loads get-dotenv; the `smoz` bin imports this module dynamically (see
 * `./launcher`), so importing the bin never fails with a stack trace.
 *
 * @module
 */
import { createCli } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { smozPlugin } from '@/src/cli/plugins/smoz';

/**
 * Build the smoz CLI runner. `importMetaUrl` makes smoz's own `package.json`
 * the host package, so `--version`, the help description and the packaged
 * config layer are smoz's, not get-dotenv's (#33).
 */
export const createSmozCli = () =>
  createCli({
    alias: 'smoz',
    importMetaUrl: import.meta.url,
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

/** Run the smoz CLI on `process.argv`. */
export const runSmoz = (): Promise<void> => createSmozCli()();
