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
