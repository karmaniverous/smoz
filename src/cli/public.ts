/**
 * Public CLI composition helpers.
 *
 * This module exists so downstream projects can scaffold a local `cli.ts`
 * (via `smoz init --cli`) without importing internal SMOZ source paths.
 *
 * Note: CLI source is excluded from TypeDoc API reference by design.
 */
export {
  smozAddPlugin,
  smozDevPlugin,
  smozInitPlugin,
  smozOpenapiPlugin,
  smozRegisterPlugin,
  useSmozPlugins,
} from './plugins/smoz';
