/**
 * SMOZ CLI — plugin-first host built on get-dotenv.
 *
 * - Build a GetDotenvCli host, install included plugins (cmd/batch/aws),
 *   and install the SMOZ command plugin (init/add/register/openapi/dev).
 * - Compose options once (passOptions), resolve dotenv context once, and run.
 */
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins/aws';
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';
import { cmdPlugin } from '@karmaniverous/get-dotenv/plugins/cmd';

import { smozPlugin } from '@/src/cli/plugins/smoz';

const main = async (): Promise<void> => {
  // Build the host and apply simple branding (version header appears when normal parsing runs).
  const cli = new GetDotenvCli('smoz');
  try {
    await cli.brand({
      importMetaUrl: import.meta.url,
      description: 'SMOZ CLI',
    });
  } catch {
    // Branding is best-effort; continue even if package metadata is unavailable.
  }

  // Root options provide familiar flags (-e/--env, --paths, --strict, --trace, etc.).
  // cmd: install parent alias -c/--cmd; batch: cross-workspace operations; aws: inert unless configured.
  // smozPlugin: registers init/add/register/openapi/dev and delegates to existing implementations.
  cli
    .attachRootOptions({ loadProcess: false })
    .use(
      cmdPlugin({
        asDefault: true,
        optionAlias: '-c, --cmd <command...>',
      }),
    )
    .use(batchPlugin())
    .use(awsPlugin())
    .use(smozPlugin())
    // Merge defaults + flags into a single options bag and resolve dotenv context once.
    .passOptions({ loadProcess: false });

  await cli.parseAsync();
};

void main();
