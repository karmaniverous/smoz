/**
 * SMOZ CLI plugins (root-mounted).
 *
 * Requirements addressed:
 * - SMOZ commands MUST be installed at the root command (no umbrella namespace).
 * - Provide a convenience installer for downstream reuse: useSmozPlugins(...).
 */
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

export const useSmozPlugins = <T extends { use: (plugin: unknown) => T }>(
  p: T,
): T =>
  p
    .use(smozInitPlugin())
    .use(smozAddPlugin())
    .use(smozRegisterPlugin())
    .use(smozOpenapiPlugin())
    .use(smozDevPlugin());
