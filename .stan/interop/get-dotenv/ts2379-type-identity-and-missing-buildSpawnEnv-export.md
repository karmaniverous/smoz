# Interop — Type identity (TS2379) and missing `buildSpawnEnv` root export

When: 2025-10-22

## Summary

Two issues observed in a clean consumer (SMOZ) after updating to the recommended import pattern:

1) Type identity mismatch for `GetDotenvCliPlugin`/`GetDotenvCli` (TS2379), even when importing the host from `@karmaniverous/get-dotenv/cliHost` and plugins from `@karmaniverous/get-dotenv/plugins`.
2) Missing root export for `buildSpawnEnv` at `@karmaniverous/get-dotenv`, causing both compile‑time (TS2305) and runtime (ESM) errors.

These surface consistently across `tsc`, rollup’s TS pass, and typedoc.

## Environment

- Downstream repo: `@karmaniverous/smoz` (CLI entry at `src/cli/index.ts`)
- Node: 22.19.0 (Windows dev host shown in logs)
- TypeScript: 5.9.x
- tsconfig highlights:
  - `"exactOptionalPropertyTypes": true`
  - `"moduleResolution": "bundler"`
- Bundler: rollup with `@rollup/plugin-typescript`
- get-dotenv: ^5.2.3

## Reproduction (minimal)

1) Align imports (consumer):
   ```ts
   import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
   import { cmdPlugin, batchPlugin, awsPlugin } from '@karmaniverous/get-dotenv/plugins';

   const cli = new GetDotenvCli('tool');
   cli.use(cmdPlugin()).use(batchPlugin()).use(awsPlugin());
   ```
2) `pnpm i` (clean install)
3) Run any of:
   - `pnpm run typecheck` (tsc)
   - `pnpm run build` (rollup + TS plugin)
   - `pnpm run docs` (typedoc)

Observe TS2379 at each `cli.use(...)` call.

Additionally, attempting to statically import the spawn env helper:
```ts
import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
```
results in TS2305 and runtime ESM errors (“does not provide an export named 'buildSpawnEnv'”).

## Evidence (concise)

Type identity (TS2379) — example excerpt (paths shortened):
```text
src/cli/index.ts(30,5): error TS2379: Argument of type 'GetDotenvCliPlugin' is not assignable to parameter of type 'import(".../node_modules/@karmaniverous/get-dotenv/dist/cliHost").GetDotenvCliPlugin' with 'exactOptionalPropertyTypes: true'.
  Types of property 'setup' are incompatible.
    Type '(cli: GetDotenvCli<GetDotenvOptions>) => void | Promise<void>' is not assignable to type '(cli: import(".../dist/cliHost").GetDotenvCli<GetDotenvOptions>) => void | Promise<void>'.
      Types of parameters 'cli' and 'cli' are incompatible.
        Type 'import(".../dist/cliHost").GetDotenvCli<GetDotenvOptions>' is not assignable to type 'GetDotenvCli<GetDotenvOptions>'.
          Property '#private' in type 'GetDotenvCli' refers to a different member that cannot be accessed from within type 'GetDotenvCli'.
```

Missing export (TS2305) and runtime:
```text
TS2305: Module '"@karmaniverous/get-dotenv"' has no exported member 'buildSpawnEnv'.
SyntaxError: The requested module '@karmaniverous/get-dotenv' does not provide an export named 'buildSpawnEnv'
```

Notes:
- TS2379 shows the “expected” type originating from `import(".../node_modules/@karmaniverous/get-dotenv/dist/cliHost").GetDotenvCliPlugin`. That implies the emitted plugin declarations (or a consuming declaration) still reference an internal “dist/cliHost” module identity rather than the public subpath. With private fields on the class, this creates a hard identity split.

## Root-cause hypothesis

1) Type identity split across subpaths/artifacts
   - The plugins and the host are compiled/emitted in a way that imports the host class type from different module ids (e.g., a `dist/cliHost` internal path in one .d.ts versus the public subpath in another).
   - Because `GetDotenvCli` uses private class fields, TypeScript treats class types from different declaration sources as distinct, hence the TS2379 “#private refers to a different member” failure.

2) Root export surface incomplete
   - `buildSpawnEnv` exists internally but is not exported at the package root. Consumers following a “static import only” policy cannot use it without resorting to dynamic import or private subpaths.

## Requested upstream changes

1) Guarantee a single public type identity for the host across all public subpaths
   - Ensure that emitted plugin and barrel `.d.ts` import host types only from the public subpath:
     ```
     @karmaniverous/get-dotenv/cliHost
     ```
     and never from `/dist/...` or relative paths.
   - Add/keep a CI guard (e.g., `verify:types`) that fails the build if any emitted plugin `.d.ts` references non‑public/relative paths for host types.
   - Consider exporting a structural public interface (e.g., `GetDotenvCliPublic`) specifically for plugin signatures instead of the concrete class with private fields. This removes private‑field identity from the API surface the plugins must accept.

2) Export `buildSpawnEnv` at the package root (or publish a documented public subpath)
   - Add a stable root export:
     ```ts
     export { buildSpawnEnv } from './...';
     ```
     so consumers can:
     ```ts
     import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
     ```
     Alternatively, provide a clearly‑documented public subpath (e.g., `@karmaniverous/get-dotenv/spawn`) if keeping the root minimal is preferred.

## Acceptance criteria

In a clean consumer workspace with:
- Node 22.19.x
- TypeScript 5.9.x (`exactOptionalPropertyTypes: true`, `moduleResolution: "bundler"`)
- rollup + `@rollup/plugin-typescript`
- typedoc

All of the following succeed with 0 TS errors:
1) `tsc -p tsconfig.json`
2) `rollup --config ...`
3) `typedoc --emit none`

And:
- The minimal host+plugins snippet compiles without casting:
  ```ts
  import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
  import { cmdPlugin, batchPlugin, awsPlugin } from '@karmaniverous/get-dotenv/plugins';

  const cli = new GetDotenvCli('tool');
  cli.use(cmdPlugin()).use(batchPlugin()).use(awsPlugin());
  ```
- Grepping emitted `.d.ts` under `@karmaniverous/get-dotenv` confirms that plugins and barrels import types only from `@karmaniverous/get-dotenv/cliHost` (no `/dist/cliHost`, no relative paths).
- The static import works for spawn env:
  ```ts
  import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
  ```
  and at runtime (ESM), the symbol is exported from the package root without requiring dynamic import.

## Notes (downstream posture)

- We removed dynamic import usage in our spawn env helper and now attempt a static import from the root to keep policy (“avoid dynamic imports unless compelling”). This fails currently because the root does not export `buildSpawnEnv`.
- We will not work around type identity with `as unknown as` casts or private/internal paths. Since the package is under our ownership, we prefer a source fix that guarantees a single public identity and a stable, documented export surface.
