import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { runAdd } from '@/src/cli/add';
import { repoRoot } from '@/src/cli/plugins/smoz.root';

export const smozAddPlugin = () =>
  definePlugin({
    ns: 'add',
    setup(cli) {
      cli
        .description('Scaffold a function under app/functions')
        .argument('<spec>', 'spec: <eventType>/<segments...>/<method>')
        .action(async (spec: string) => {
          const root = repoRoot();
          if (typeof spec !== 'string' || !spec.trim()) {
            throw new Error('smoz add: missing <spec> (e.g., rest/foo/get)');
          }
          await runAdd(root, spec);
        });
    },
  });
