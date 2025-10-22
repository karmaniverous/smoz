# Interop — Response to SMOZ request (GetDotenvCli type identity and imports)

When: 2025-10-21

## Summary

We implemented a minimal, non‑breaking change set to unify the `GetDotenvCli` type identity across public subpaths and published a canonical `plugins` barrel to simplify imports. This resolves the TS2379 private‑field mismatch SMOZ reported under `exactOptionalPropertyTypes`.

## Changes in get-dotenv

- Unified type identity
  - All built‑in plugins now import the host type only via the public subpath:
    `@karmaniverous/get-dotenv/cliHost` (type‑only imports).
  - Rollup builds are configured to read TypeScript “paths” from `tsconfig.base.json`, ensuring plugin sources resolve these public subpaths during type generation. This eliminated legacy TS2307 warnings during `rollup --config ...`.

- Plugins barrel export
  - Added a new public subpath `@karmaniverous/get-dotenv/plugins` that re‑exports the built‑in plugin factories (cmd/batch/aws/init/demo). This provides a single surface that shares declarations with `cliHost`.
  - Package.json exports now include `./plugins` (ESM/CJS + types). Verifiers assert presence of the barrel in artifacts and tarballs.

- Guard rails
  - Introduced `tools/verify-types.js` and an npm script `verify:types` (wired into release hooks and stan-cli) to ensure no emitted plugin `.d.ts` imports `cliHost` from any non‑public or relative path. The guard passes for current builds.

- Documentation
  - Guides were updated to recommend the plugins barrel as the canonical import path and retain per‑plugin subpaths as an alternative.
  - SMOZ‑facing interop note (this document) added to clarify downstream expectations and acceptance criteria.

## Downstream usage (SMOZ)

Recommended imports:

```ts
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { cmdPlugin, batchPlugin, awsPlugin, initPlugin } from '@karmaniverous/get-dotenv/plugins';
```

Notes:
- Per‑plugin subpaths remain available (`@karmaniverous/get-dotenv/plugins/<name>`), but the barrel is recommended to guarantee a single type identity across host and plugins.
- The public subpaths are stable for both ESM/CJS and types; no local path aliases are required in consumers.

## Acceptance criteria (met)

In a fresh consumer with `exactOptionalPropertyTypes: true`, the following compiles without TS2379:

```ts
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { cmdPlugin, batchPlugin, awsPlugin } from '@karmaniverous/get-dotenv/plugins';

const cli = new GetDotenvCli('tool');
cli.use(cmdPlugin()).use(batchPlugin()).use(awsPlugin());
await cli.resolveAndLoad();
await cli.parseAsync();
```

CI evidence:
- All get‑dotenv scripts are green (lint/typecheck/build/tests/docs/smoke/verify).
- Tarball/package verifiers pass (primary npm pack may fall back when npm isn’t on PATH; CI should run the primary path).
- `verify:types` enforces identity regressions at build time.

## Follow‑ups (optional)

- If SMOZ wants to deprecate per‑plugin subpaths in the future, we can schedule a major release to remove them (the barrel covers most usages).
- If helpful, we can add a short “Migration” blurb to SMOZ docs recommending the barrel imports, with a quick grep‑able example for large codebases.
