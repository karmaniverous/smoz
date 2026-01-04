/**
 * SMOZ CLI (programmatic surface)
 *
 * Public, import-safe composition helpers for downstream CLIs.
 *
 * Import from `@karmaniverous/smoz/cli`.
 *
 * Note: the executable CLI entrypoint lives in `src/cli/bin.ts`.
 */
export {
  smozAddPlugin,
  smozDevPlugin,
  smozInitPlugin,
  smozOpenapiPlugin,
  smozRegisterPlugin,
  useSmozPlugins,
} from './plugins/smoz';
