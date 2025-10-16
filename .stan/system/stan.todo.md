/// Development Plan

# Development Plan

When updated: 2025-10-16T00:00:00Z

## Next up (near‑term, actionable)

1. No immediate items. Monitor dev UX and template lint/typecheck in CI.

## Completed (recent)

52. App.create overloads: preserve strong type inference when
    eventTypeMapSchema is omitted by defaulting to baseEventTypeMapSchema
    (typed) without making it required; retains runtime default behavior.
53. Docs: add Step Functions recipe page; link it from Recipes index and
    README Quick links. Project prompt: note that baseEventTypeMapSchema
    includes 'step' with { Payload?: unknown } and uses catchall(z.unknown())
    (Zod v4) to allow additional properties.
54. Base event map: add first-class 'step' event with optional Payload
    wrapper ({ Payload?: unknown }) and allow extra keys via
    catchall(z.unknown()) for Zod v4 (passthrough deprecated). Export
    StepFunctionInvokeEvent type.
55. CI hardening for npm alias/tarball 404: pin npm (10.9.0), force public
    registry, and add conservative fetch retries before install to avoid
    transient alias resolution issues (e.g., @smithy packages). Keeps
    installs stable on Node 22.19.0 runners.
56. Pin Node 22.19.0 across parent repo and templates:
    - Parent: add engines (>=22.19.0 <23), Volta node=22.19.0, .nvmrc,
      .node-version, and .npmrc (engine-strict=true); add CI workflow using actions/setup-node@v4 with node-version 22.19.0; add @types/node^22.
    - Templates/default: add engines/Volta; add .nvmrc/.node-version and
      .npmrc (engine-strict); include a sample CI workflow pinned to 22.19.0.

57. Inline dev: restore Route.handlerRef typing, add SMOZ_VERBOSE diagnostics
    for loaded registers, and print "(none found)" when the route list is
    empty. Resolves TS/Lint errors and clarifies empty-route cases in verbose runs.
58. Inline dev: Fix empty route table by loading the App from TS source at
    runtime (same module instance as registers) instead of a bundled import.
    This ensures registrations and route aggregation operate on the same App.
59. Inline dev (Windows): remove the `--tsconfig-paths` CLI flag when spawning
    tsx and rely on `TSX_TSCONFIG_PATHS=1` in the environment to enable
    tsconfig-paths. Fixes "C:\Program Files\nodejs\node.exe: bad option:
    --tsconfig-paths" seen during `smoz dev`.
60. Inline dev: enable tsconfig-paths in the tsx child (`--tsconfig-paths`)
    so "@/..." aliases in endpoint modules resolve at runtime. Keep register
    imports extensionless, POSIX-relative (TS-friendly) to avoid TS5097.
61. Inline dev: route detection fix — registers now use POSIX-relative import
    specifiers from app/generated to targets (no "@/" alias). Inline server
    successfully loads registers and routes (e.g., /openapi) resolve in dev.
62. Inline server type hygiene: added Route.segs and Segment typing; updated
    match() signature to clear TypeScript errors and lint warnings.
63. CLI polish: kept "-v/--version" for root version and switched `dev` verbose
    flag to "-V, --verbose". Updated docs accordingly.
64. Decompose inline dev server: moved src/cli/local/inline.server.ts into
    a folder module src/cli/local/inline.server/ with index.ts (entry),
    loaders.ts, routes.ts, and http.ts. Updated Rollup input, test entry
    path, and knip ignore; removed the original file.

65. Dev loop polish:
    - Inline: discover inline entry using packageDirectorySync based on the
      compiled CLI location; prefer compiled dist/mjs/cli/inline-server.js
      (spawn node), fallback to TS entry via tsx with TSX_TSCONFIG_PATHS=1.
    - Offline: parse and print the resolved listening URL ("[dev] offline: …")
      so the route summary’s "localhost:0" does not confuse users.

66. Dev loop robustness:
    - Inline: replace \_\_dirname usage with ESM‑safe fallback using
      fileURLToPath(import.meta.url) to seed packageDirectory cwd.
    - Offline: fix lint by guarding capture group before logging URL.

67. Inline dev: Make tsx a hard requirement; remove the compiled inline
    fallback entirely and do not fall back to serverless-offline when tsx
    is missing. The dev loop now throws a clear error instructing users to
    install tsx or run with --local offline.
68. Inline dev: Add resolveTsxCommand helper and unit tests that verify
    behavior when a local tsx is present (node + JS CLI) and when tsx is
    unavailable (hard error). This surfaces loader misconfigurations in CI
    and prevents silent fallback.
69. Inline dev: normalize the project-local tsx CLI path to POSIX
    separators in resolveTsxCommand to keep tests stable on Windows, and
    switch src/cli/dev.ts to use fs-extra for consistency with the rest of
    the codebase.
70. Decompose dev loop:
    - New module: src/cli/dev/index.ts (orchestrator), src/cli/dev/env.ts
      (env helpers), src/cli/dev/inline.ts (inline/tsx).
    - Update CLI entry to import from ./dev/index and tests to import the
      new module path. Delete src/cli/dev.ts manually to avoid large
      deletion diff.
71. Inline dev (downstream fix): prefer the compiled dist entry
    (dist/mjs/cli/inline-server.js) when present and still run it under
    tsx so downstream TS files import cleanly; fall back to the TS entry
    only in the repo workspace. Added unit tests for entry selection
    (compiled vs TS) to surface regressions early.
72. Fix App.create overload selection when providing eventTypeMapSchema:
    reorder overloads so the “provided schema” signature appears first.
    This resolves TS2322 errors seen in apps/tests that extend
    baseEventTypeMapSchema and restores typecheck/build/docs green without
    changing runtime behavior.
73. Follow-up: place the create() implementation after both overload
    signatures (TypeScript requires all overload signatures to precede
    the implementation). Keeps the “provided schema” signature first
    while satisfying TS2389 and preserving runtime behavior.
74. Documentation partition & rationalization:
    - Extracted all durable product/engineering requirements from
      `.stan/system/stan.project.md` into a new
      `.stan/system/stan.requirements.md`.
    - Rewrote `stan.project.md` to contain only project‑specific assistant
      instructions and clear scope/separation notes.
    - No content lost; structure clarified to keep requirements separate from assistant policies.

- +- Documentation
- - Partitioned project docs: extracted all durable product requirements from stan.project.md into a new .stan/system/stan.requirements.md; trimmed stan.project.md to assistant-only instructions and added a scope note. No content lost; structure clarified to keep requirements separate from assistant policies.
