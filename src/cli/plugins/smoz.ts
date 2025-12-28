/**
 * SMOZ CLI plugins (root-mounted).
 *
 * Requirements addressed:
 * - SMOZ commands MUST be installed at the root command (no umbrella namespace).
 * - Provide a convenience installer for downstream reuse: useSmozPlugins(...).
 */
import type { GetDotenvOptions } from '@karmaniverous/get-dotenv';
import type { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';

import { smozAddPlugin } from './smoz.add';
import { smozDevPlugin } from './smoz.dev';
import { smozInitPlugin } from './smoz.init';
import { smozOpenapiPlugin } from './smoz.openapi';
import { smozRegisterPlugin } from './smoz.register';

export { smozAddPlugin } from './smoz.add';
export { smozDevPlugin } from './smoz.dev';
export { smozInitPlugin } from './smoz.init';
export { smozOpenapiPlugin } from './smoz.openapi';
export { smozRegisterPlugin } from './smoz.register';

type Cli = GetDotenvCli<GetDotenvOptions>;

export const useSmozPlugins = (p: Cli): Cli =>
  p
    .use(smozInitPlugin())
    .use(smozAddPlugin())
    .use(smozRegisterPlugin())
    .use(smozOpenapiPlugin())
    .use(smozDevPlugin());
