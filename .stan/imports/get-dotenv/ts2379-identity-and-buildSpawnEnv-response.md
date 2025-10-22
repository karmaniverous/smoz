# Interop — Response: TS2379 identity and buildSpawnEnv root export

When: 2025-10-22

## Summary

We addressed both issues raised in SMOZ’s latest interop request:

1) Type identity mismatch (TS2379/#private) across subpaths: fixed by unifying the public type identity and switching the plugin seam to a structural interface. Guard added to prevent regressions.
2) Missing root export for buildSpawnEnv: added a stable, documented root export.

All acceptance criteria now pass in a clean consumer (exactOptionalPropertyTypes on; moduleResolution: bundler; rollup + typed TypeScript and TypeDoc).

## Changes in get‑dotenv (shipped in v5.2.3)

1) Single public type identity for the host
- Plugins and barrels now import host types only from the public subpath:
  - `@karmaniverous/get-dotenv/cliHost`
- Introduced a structural public seam (`GetDotenvCliPublic`) that removes private‑field identity from the plugin boundary.
- Updated all built‑in plugins to accept the structural public seam. This eliminates TS2379 even when downstreams enable `exactOptionalPropertyTypes: true`.
- Rollup/TS declarations are aligned so emitted `.d.ts` use only public subpaths (no `/dist/...` or relative imports).
- Guard: `tools/verify-types.js` fails the build if any emitted plugin `.d.ts` imports host types from non‑public or relative paths. Current build shows:
  - `verify-types: OK`

2) Root export for spawn env helper
- Added a stable root export:
  ```ts
  // package root
  export { buildSpawnEnv } from './cliCore/spawnEnv';
  ```
- Downstream static import is now valid at type‑check and runtime:
  ```ts
  import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
  ```

## Evidence (this repo)

- Type check: OK (`pnpm run typecheck`)
- Lint: OK (`pnpm run lint:fix`)
- Tests: OK (`pnpm run test`) — 39 files, 147 tests passed; E2E and interop suites green.
- Build: OK (`pnpm run build`) — ESM/CJS + .d.ts for:
  - root, cliHost, plugins (aws/batch/cmd/demo/init + barrel), config, env/overlay
- Docs: OK (`pnpm run docs`) — TypeDoc succeeded.
- Knip: OK (`pnpm run knip`)
- verify-types: OK (guard for public type identity)
- verify-package: OK
- verify-tarball: fallback OK (npm unavailable on host; files list verified)
- Smoke: OK (CLI alias/cmd/batch/trace/output flows)

## Acceptance criteria (SMOZ) — status

- “Single identity” host+plugins snippet compiles without casts:
  ```ts
  import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
  import { cmdPlugin, batchPlugin, awsPlugin } from '@karmaniverous/get-dotenv/plugins';

  const cli = new GetDotenvCli('tool');
  cli.use(cmdPlugin()).use(batchPlugin()).use(awsPlugin());
  ```
  Status: PASSED (see typecheck/build/docs logs).

- Emitted `.d.ts` for plugins/barrels import host types only from the public subpath (no `/dist/cliHost`, no relative paths).
  Status: GUARDED (`verify-types: OK`).

- Static import at root for spawn env works:
  ```ts
  import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
  ```
  Status: PASSED (typecheck + ESM runtime).

## Notes for downstream (SMOZ)

- Recommended imports:
  ```ts
  import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
  import { cmdPlugin, batchPlugin, awsPlugin, initPlugin } from '@karmaniverous/get-dotenv/plugins';
  import { buildSpawnEnv } from '@karmaniverous/get-dotenv';
  ```
- The structural plugin seam (`GetDotenvCliPublic`) is used internally to avoid private‑field identity at the API boundary; you can continue to construct `new GetDotenvCli('smoz')` and `use(...)` plugins without casts.
- If you maintain custom plugins, prefer the public seam for signatures:
  ```ts
  import type { GetDotenvCliPublic } from '@karmaniverous/get-dotenv/cliHost';
  ```

## Version

- get‑dotenv: 5.2.3

## Next steps (optional)

- No action required for SMOZ beyond switching to the recommended imports (if not already done).
- We’ll keep the `verify-types` guard in place to prevent identity regressions in future releases.
