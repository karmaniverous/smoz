/**
 * SMOZ get-dotenv plugin entry (`@karmaniverous/smoz/cli`).
 *
 * Mount smoz's commands (init, add, register, openapi, dev) in your own
 * get-dotenv host CLI. Needs `@karmaniverous/get-dotenv` ^8.0.0, an optional peer
 * of smoz; the main entry (`@karmaniverous/smoz`) never loads it.
 *
 * ```ts
 * import { createCli } from '@karmaniverous/get-dotenv/cli';
 * import { smozPlugin } from '@karmaniverous/smoz/cli';
 *
 * await createCli({
 *   alias: 'vc',
 *   importMetaUrl: import.meta.url,
 *   compose: (cli) => cli.use(smozPlugin()),
 * })();
 * // vc smoz openapi --verbose
 * ```
 *
 * @packageDocumentation
 */

export { smozPlugin } from './cli/plugins/smoz';
