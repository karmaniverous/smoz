# Development Plan

When updated: 2025-10-19T00:00:00Z

## Next up (near‑term, actionable)

- Wire full get-dotenv host + plugins
  - Instantiate the host and install: AWS base plugin (cli-export/optional sso), smoz command plugins (init/add/register/openapi/dev), and expose get-dotenv cmd/batch.
  - Adopt spawn-env for children (inline/offline/prettier/typedoc) and stage precedence resolution (--stage > plugins.smoz.stage > env.STAGE > default inference).
  - Keep outputs stable; preserve byte-for-byte register/openapi/package surfaces.

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

  (Initial step landed below: cmd/batch delegation via host; smoz command plugins to follow.)

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

- Remove dynamic import from spawn env helper
  - Replaced the dynamic import in `src/cli/util/spawnEnv.ts` with a static
    import from `@karmaniverous/get-dotenv` and removed the local fallback.
  - Keeps policy of avoiding dynamic imports unless compelling.

- Interop note for get-dotenv: TS2379 identity + missing root export
  - Authored `.stan/interop/get-dotenv/ts2379-type-identity-and-missing-buildSpawnEnv-export.md`
    documenting: (1) lingering type-identity mismatch for `GetDotenvCliPlugin`
    under `exactOptionalPropertyTypes`, and (2) missing root export for `buildSpawnEnv`.

- Remove spawn-env wrapper; use get-dotenv directly
  - Deleted `src/cli/util/spawnEnv.ts` and updated all call sites to import
    `buildSpawnEnv` from `@karmaniverous/get-dotenv` directly:
    - `src/cli/openapi.ts`
    - `src/cli/local/offline.ts`
    - `src/cli/dev/inline.ts`

- Remove unnecessary await on buildSpawnEnv (lint hygiene)
  - Updated callers to reflect the synchronous API and satisfy
    @typescript-eslint/await-thenable:
    - src/cli/openapi.ts
    - src/cli/local/offline.ts
    - src/cli/dev/inline.ts
