import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { repoRoot } from '@/src/cli/plugins/smoz.root';
import { runRegister } from '@/src/cli/register';

export const smozRegisterPlugin = () =>
  definePlugin({
    ns: 'register',
    setup(cli) {
      cli
        .description('Generate side-effect register files')
        .action(async () => {
          const root = repoRoot();
          await runRegister(root);
        });
    },
  });
