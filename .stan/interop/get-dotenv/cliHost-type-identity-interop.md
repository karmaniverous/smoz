# Interop — GetDotenvCli type identity across subpaths (plugins vs cliHost)

When: 2025-10-20

Context

- SMOZ now embeds a get‑dotenv plugin‑first host. We build a CLI via:
  ```ts
  import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
  import { cmdPlugin } from '@karmaniverous/get-dotenv/plugins/cmd';
  import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';
  import { awsPlugin } from '@karmaniverous/get-dotenv/plugins/aws';
  ```
  then `cli.use(cmdPlugin()).use(batchPlugin()).use(awsPlugin())`.

Observed issues (downstream)

- TypeScript errors when calling `cli.use(plugin)`:
  ```
  TS2379: Argument of type 'GetDotenvCliPlugin' is not assignable to parameter
  of type '.../dist/cliHost).GetDotenvCliPlugin' with exactOptionalPropertyTypes: true.
  ...
  Property '#private' in type 'GetDotenvCli' refers to a different member that
  cannot be accessed from within type 'GetDotenvCli'.
  ```
  These occur at:
  - src/cli/index.ts: using GetDotenvCli from '@karmaniverous/get-dotenv/cliHost'
    and plugins from '@karmaniverous/get-dotenv/plugins/\*'
  - exactOptionalPropertyTypes is enabled in this repo.

Reproduction (minimal)

```ts
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { cmdPlugin } from '@karmaniverous/get-dotenv/plugins/cmd';

const cli = new GetDotenvCli('tool');
cli.use(cmdPlugin()); // TS2379 / #private mismatch under exactOptionalPropertyTypes
```

Environment

- Node 22.19.x
- TypeScript exactOptionalPropertyTypes: true
- SMOZ repo: @karmaniverous/smoz (CLI entry at src/cli/index.ts)
- get‑dotenv: ^5.2.2 (stabilized named createCli and plugin-first host)

Root cause hypothesis

- Type identity split across subpaths. The plugins (`plugins/*`) are compiled
  against a type identity for GetDotenvCli from a resolved path like
  `.../dist/cliHost`. Meanwhile, consumers import GetDotenvCli from the
  `cliHost` subpath (source or a different .d.ts reference). TypeScript treats
  the two class types as distinct (different private fields), so a
  `GetDotenvCliPlugin` built against one identity is not assignable to the
  `GetDotenvCli` from the other.
- This is a common pattern when multiple entrypoints (subpaths) each re‑export
  their own declarations with private class fields — type identity differs even
  when the shape is structurally compatible.

Best outcome for SMOZ (upstream changes)

1. Single type identity for the host across all public subpaths:
   - Ensure that both the `cliHost` subpath and the `plugins/*` subpaths import
     (type‑only) from the exact same declaration source for
     `GetDotenvCli`/`GetDotenvCliPlugin`. Avoid duplicating private class
     declarations across subpaths that result in distinct identities.
   - Typical approaches:
     - Have all subpaths’ .d.ts re‑export from a single canonical .d.ts module
       (e.g., `cliHost`), or
     - Re‑export types from the package root with `typesVersions` so all
       subpaths resolve to the same declaration identity.
2. Provide a “plugins” barrel that is guaranteed to share identity with
   `cliHost`:
   - Example:
     ```ts
     import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
     import {
       cmdPlugin,
       batchPlugin,
       awsPlugin,
     } from '@karmaniverous/get-dotenv/plugins';
     ```
     with all three plugin factories typed against the same `GetDotenvCli` that
     `cliHost` exports. The barrel ensures a single type source.
3. Document the canonical import pattern in the README/Guides:
   - “Import GetDotenvCli from ‘…/cliHost’ and all plugins from ‘…/plugins’ barrel
     (or plugin-specific subpaths), and they share type identity.”

Acceptance criteria

- In a fresh consumer (with exactOptionalPropertyTypes: true), the following compiles:

  ```ts
  import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
  import {
    cmdPlugin,
    batchPlugin,
    awsPlugin,
  } from '@karmaniverous/get-dotenv/plugins';

  const cli = new GetDotenvCli('tool');
  cli.use(cmdPlugin()).use(batchPlugin()).use(awsPlugin());
  await cli.resolveAndLoad();
  await cli.parseAsync();
  ```

  with no TS2379 or private field identity errors.

Notes

- This request is about type identity only; at runtime the API already works.
- Avoiding duplicate private class declarations across subpaths resolves the
  mismatch cleanly and prevents downstreams from needing `as unknown as` hacks.
