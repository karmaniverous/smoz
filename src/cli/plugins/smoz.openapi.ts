import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { runOpenapi } from '@/src/cli/openapi';
import { repoRoot } from '@/src/cli/plugins/smoz.root';

export const smozOpenapiPlugin = () =>
  definePlugin({
    ns: 'openapi',
    setup(cli) {
      cli
        .description('Generate OpenAPI document (app/generated/openapi.json)')
        .option('-V, --verbose', 'verbose output')
        .action(async (opts: { verbose?: boolean }) => {
          const root = repoRoot();
          await runOpenapi(root, { verbose: !!opts.verbose });
        });
    },
  });
