/**
 * The `smoz` bin. A launcher: it loads the CLI (`./run`, and through it
 * get-dotenv, an optional peer) with a dynamic `import()`, and prints an
 * install hint when get-dotenv is missing. Library code that wants smoz's
 * commands imports `smozPlugin` from `@karmaniverous/smoz/cli` instead.
 *
 * @module
 */
import { launch } from '@/src/cli/launcher';

await launch(() => import('@/src/cli/run'), {
  bin: 'smoz',
  pkg: '@karmaniverous/smoz',
});
