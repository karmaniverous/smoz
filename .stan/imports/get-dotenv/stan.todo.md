# Development Plan

When updated: 2025-10-19T00:00:00Z

## Next up (near‑term, actionable)

- Replace CLI entry with get-dotenv host
  - Create a GetDotenvCli-based host in src/cli/index.ts (or src/cli/host.ts and re-export).
  - Branding: “smoz vX.Y.Z”; global flags: -e/--env, --strict, --trace, -V/--verbose.
  - Remove Commander wiring; no fallback path.

- Install and wire plugins in the host
  - Always install get-dotenv AWS base plugin (inert unless configured).
  - Install smoz plugins: init, add, register, openapi, dev (thin wrappers over runInit/runAdd/runRegister/runOpenapi/runDev).
  - Expose get-dotenv cmd and batch commands alongside smoz commands.

- Validation and diagnostics posture
  - Host-level validation: Zod (JS/TS) or requiredKeys (JSON/YAML) once per invocation.
  - Warn by default; fail with --strict.
  - In verbose/trace, print layered trace with masking and entropy warnings (once per key).

- Adopt spawn-env normalization everywhere
  - Use get-dotenv’s buildSpawnEnv(base, ctx.dotenv) for:
    - tsx inline server
    - serverless offline
    - serverless package/deploy hooks
    - prettier/typedoc/other child tools
  - Log the normalized env snapshot in verbose mode (masked).

- Stage resolution (dev) implementation
  - Precedence: --stage > plugins.smoz.stage (interpolated) > process.env.STAGE > default inference (first non-”default” stage; else “dev”).
  - Do not bind -e to stage implicitly; document plugins.smoz.stage: "${ENV:dev}" as the recommended opt-in.
  - Pass final stage to children via spawn-env (ensure STAGE present for serverless/offline).

- Expose cmd and batch
  - cmd: honor shell semantics from get-dotenv; ensure quoting guidance documented (single quotes to avoid outer-shell expansion).
  - batch: implement flags `--concurrency <n>` (default 1) and `--live`; verify buffered capture and end-of-run summary paths; keep logs consistent with get-dotenv.

- Remove deprecated Zod usage
  - Replace any lingering z.any() placeholders in templates/docs with z.unknown().
  - Use .catchall(z.unknown()) instead of .passthrough() in examples/doc snippets.

- Serverless STAGE simplification (follow-on)
  - Inject STAGE from provider.stage/provider.environment.
  - Remove STAGE from stage.params/schema in the app fixture and template.
  - Update tests/templates/docs accordingly.

- Tests and CI updates
  - Register/openapi/package outputs remain byte-for-byte identical.
  - Dev: stage precedence matrix; inline/offline spawn-env normalization; Windows CI smoke.
  - Add cmd/batch smoke tests (quote handling and env propagation).
  - Verify help header branding and flags (-e/--strict/--trace/-V).

- Documentation updates
  - CLI: clarify host-based design; new commands (cmd/batch); global flags; getdotenv.config.\* surfaces.
  - Dev guide: stage precedence; recommend plugins.smoz.stage mapping; strict/diagnostics notes.
  - Troubleshooting: add safe tracing and quoting recipes for cmd; clarify Windows path hygiene is handled by spawn-env.

## Completed (recent)

- Promote root helpers to class methods (remove side‑effect enhancer)
  - Export a subclass from src/cliHost/index.ts that adds attachRootOptions()
    and passOptions() as real methods on GetDotenvCli, delegating to cliCore
    helpers. Remove the unconditional side‑effect import previously used to
    patch the prototype.
  - Update src/index.ts to import the host from './cliHost' and drop the
    enhancer import. No behavior changes; methods are now explicit and
    discoverable without relying on augmentation.
- Interop design note for getdotenv:
  - Added `.stan/interop/get-dotenv/smoz-cli-host-integration.md` capturing host+plugin
    integration, layered resolution with per‑layer interpolation, Zod validation,
    key aliasing, tracing/redaction/entropy, spawn env normalization, and SMOZ
    stage handling (removing STAGE from stage.params and deriving from stage precedence).
  - This note is the basis for interop negotiation with the getdotenv assistant prior
    to implementation across both repositories.

- Documentation partition & rationalization:
  - Extracted all durable product/engineering requirements from
    `.stan/system/stan.project.md` into a new `.stan/system/stan.requirements.md`.
  - Rewrote `stan.project.md` to contain only project‑specific assistant
    instructions and clear scope/separation notes.
  - No content lost; structure clarified to keep requirements separate from assistant policies.

- Follow‑up on App.create overloads (implementation placement):
  - Placed the `create()` implementation after both overload signatures (TypeScript
    requires overload signatures to precede the implementation). Keeps the “provided
    schema” signature first while satisfying TS2389 and preserving runtime behavior.

- Fix App.create overload selection with provided eventTypeMapSchema:
  - Reordered overloads so the “provided schema” signature appears first. Resolves
    TS2322 errors seen in apps/tests that extend `baseEventTypeMapSchema` and restores
    typecheck/build/docs green without changing runtime behavior.

- Inline dev (downstream fix) — entry selection:
  - Prefer the compiled dist entry (`dist/mjs/cli/inline-server.js`) when present and
    still run it under tsx so downstream TS files import cleanly; fall back to the TS
    entry only in the repo workspace. Added unit tests for entry selection to surface
    regressions early.

- Dev loop decomposition:
  - Introduced `src/cli/dev/index.ts` (orchestrator), `src/cli/dev/env.ts` (env
    helpers), and `src/cli/dev/inline.ts` (inline/tsx).
  - Updated the CLI entry to import from the new orchestrator and adjusted tests to
    the new module boundaries. Removed the old `src/cli/dev.ts`.

- Docs: improved “Plugin-first host” page with a wiring guide for included plugins (cmd, batch, aws, init), config examples, usage, and pitfalls.

- Canonical host entry: named createCli (alias, branding); refactor CLI
  - Exported createCli from src/index.ts with options { alias, branding } and a run(argv) method.
  - Updated shipped CLI to call createCli({ alias: 'getdotenv' }).run(process.argv.slice(2)).
  - No default export or runCli helper introduced; named export only per interop plan.

- Interop tests: prevent process.exit on help under Vitest
  - Added Commander exitOverride in createCli when VITEST_WORKER_ID/GETDOTENV_TEST is present.
  - Swallows help/version exits; rethrows other errors to preserve failure paths.

- Unify GetDotenvCli type identity across subpaths; add plugins barrel
  - Updated all plugin sources to import GetDotenvCli type from the public
    '@karmaniverous/get-dotenv/cliHost' subpath (type-only), eliminating TS2379
    private-field identity errors under exactOptionalPropertyTypes.
  - Added tsconfig path aliases so local dev resolves the public subpaths to
    source (cliHost and plugins barrel).
  - Introduced a plugins barrel at 'src/plugins/index.ts' and exported it under
    the './plugins' subpath. Rollup builds ESM/CJS outputs and type bundles.
  - Extended verification scripts to assert presence of './plugins' in exports
    and 'dist/plugins.mjs' in artifacts and tarball checks.
  - Rationale: keep per-plugin subpaths for flexibility, but recommend the
    barrel as the canonical import path; identity is now unified across both.

- Interop tests: short-circuit help under tests
  - When under tests and "-h/--help" is present, render help via outputHelp()
    and return before parseAsync to avoid Commander exits in all environments.

- Fix CJS createCli help termination path:
  - Short-circuit "-h/--help" in createCli.run across all environments (not only
    under tests) to avoid Commander process.exit under CJS. Keeps behavior
    consistent and resolves the failing interop test while preserving real CLI
    behavior (prints help and returns with code 0).

- ESM interop timing fix:
  - Moved help short-circuit to run before branding/parsing so
    `createCli().run(['-h'])` returns immediately under dynamic ESM without
    awaiting package metadata IO. Avoids test timeout while preserving CLI
    behavior (prints help and exits 0).

- Distribute cmd and demo plugins
  - Added rollup builds (ESM/CJS and types) and package.json exports for ./plugins/cmd and ./plugins/demo; updated verification scripts to assert presence.

- Rollup TS paths and knip entry for plugins barrel:
  - Added TypeScript "paths" mappings to tsconfig.base.json for '@karmaniverous/get-dotenv/cliHost' and '@karmaniverous/get-dotenv/plugins' so @rollup/plugin-typescript resolves type-only imports during builds without TS2307 warnings.
  - Included 'src/plugins/index.ts' in knip.json "entry" to silence the unused-file warning for the plugins barrel.
  - Updated Guides to recommend importing plugins via the barrel.

- Add verify-types guard for plugin .d.ts
  - Introduced tools/verify-types.js and npm script "verify:types".
  - Release hooks run verify:types after build to ensure no plugin .d.ts
    imports cliHost via non-public or relative paths.

- Docs alignment + SMOZ interop response
  - Updated plugin guides (cmd/batch/demo/init) with “Import paths” sections,
    recommending the plugins barrel and retaining per‑plugin subpath examples.
  - Confirmed the AWS plugin page and the Plugin‑first host guide already
    recommend the barrel and are consistent with the current implementation
    (root options, included plugins, once‑per‑invoke context).
  - Added .stan/interop/smoz/type-identity-response.md summarizing the change
    set, downstream import guidance, and acceptance criteria.

- Public host interface root spawn env export
  - Introduced a structural public interface for the host
    (GetDotenvCliPublic = Command & { ns, getCtx, resolveAndLoad }) and
    switched the plugin seam to use it. This removes nominal class identity
    at the boundary and eliminates TS2379 in consumers.
  - Re-exported buildSpawnEnv at the package root to support static imports
    (import { buildSpawnEnv } from '@karmaniverous/get-dotenv').

- Generic plugin seam and batch/cmd type fixes
  - Made GetDotenvCliPlugin generic over options and threaded TOptions through
    GetDotenvCli. Cast the host to GetDotenvCliPublic<TOptions> at hook sites.
  - Replaced lingering GetDotenvCli intersections in batch actions with
    GetDotenvCliPublic and fixed the cmd alias call site typing.

+- Fix plugin seam casts and batch typing

- - Cast `this` to the structural public interface when invoking plugin hooks to
- satisfy exactOptionalPropertyTypes invariance:
- `p.setup(this as unknown as GetDotenvCliPublic<GetDotenvOptions>)` and
- `p.afterResolve(this as unknown as GetDotenvCliPublic<GetDotenvOptions>, ctx as unknown as GetDotenvCliCtx<GetDotenvOptions>)`.
- - Replace a lingering `GetDotenvCli` union constituent in
- `src/plugins/batch/actions/defaultCmdAction.ts` with `GetDotenvCliPublic`
- to remove the missing symbol error and redundant type constituent lints.

- Interop response — TS2379 identity and buildSpawnEnv root export
  - Authored `.stan/interop/smoz/ts2379-identity-and-buildSpawnEnv-response.md`
    confirming single public type identity (structural seam public subpaths),
    root export for `buildSpawnEnv`, and passing acceptance criteria (tsc/rollup/
    typedoc). Guard (`verify-types`) in place to prevent regressions.

- Safety-rail test fix for helpers exposure
  - Updated the test to import `GetDotenvCli` from `src/cliHost/index.ts`
    (the /cliHost entry) so the enhancer side-effect runs.
  - Added explicit assertions to satisfy lint rules and verify presence.

- Tidy-ups: remove enhancer module and scrub imports
  - Deleted src/cliCore/enhanceGetDotenvCli.ts (no longer referenced after
    promoting methods onto the class).
  - Removed legacy enhancer imports from src/plugins/cmd/alias.ts and updated
    tests to import the host from the cliHost entry (no side-effect required).
  - Fixed src/cliHost/help.order.test.ts to import the host from './index'
    (removes the old enhancer import) and added explicit types to satisfy
    strict ESLint rules.