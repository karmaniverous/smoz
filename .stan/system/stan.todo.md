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

- Remove deprecated Zod usage (placeholders):
  - Replaced z.any() with z.unknown() in CLI generator templates (src/cli/add.ts) so new
    endpoints scaffold with Zod v4‑preferred schemas.
  - Updated the fixture endpoint (app/functions/rest/openapi/get/lambda.ts) to use
    z.unknown() for the response schema.
  - Note: .catchall(z.unknown()) remains the recommended pattern for permissive object
    shapes; not applicable to these simple placeholder schemas.

- CLI bootstrap: remove Commander; minimal get-dotenv–aware entry
  - Removed Commander dependency and replaced the CLI entry with a small bootstrap
    that dynamically loads @karmaniverous/get-dotenv (preparing for full host wiring)
    and maps existing commands directly to implementations (register/openapi/add/init/dev).
  - Preserved default signature behavior and `tsx src/cli/index.ts register` path used by CI.
  - Added an ambient declaration to keep TypeScript happy for the dynamic import
    until the host+plugins are fully wired.
  - Next up: instantiate the real host with plugins (AWS base; smoz commands)
    and move command parsing/flags to the host. Adopt spawn-env and stage precedence.

- Implement get-dotenv host command registration:
  - Implemented attachSmozCommands to register init/add/register/openapi/dev on a
    generic host (feature-detecting addCommand/registerCommand/command methods).
  - Mapped flags to existing run\* functions, preserving current CLI behaviors:
    - init: -t/--template, -y/--yes, --no-install, --install <pm>, --conflict <policy>
    - add: positional <spec> (or --spec/-s)
    - register: no flags
    - openapi: -V/--verbose
    - dev: -r/--register | -R/--no-register, -o/--openapi | -O/--no-openapi,
      -l/--local [inline|offline|false], -s/--stage <name>, -p/--port <n>, -V/--verbose
  - Delegation ensures stage precedence and spawn-env normalization remain honored
    via existing helpers (resolveStage/buildSpawnEnvMaybe); no behavior changes to
    current code paths.
  - Added unit tests (src/cli/plugins/smoz.attach.test.ts) with a fake host to assert
    registration and delegation without changing defaults.

- Fix host command plugin & test typings:
  - Tightened install() to call host methods via typed locals after type-guards,
    eliminating @typescript-eslint/no-unsafe-call errors.
  - Removed unused parameter in the 'register' runner.
  - Updated src/cli/plugins/smoz.attach.test.ts to avoid vi.Mock typing and direct
    `.mock` access; switched to vitest’s toHaveBeenCalledWith assertions.
  - Guarded command function lookups and used non-null assertions when invoking
    host.commands[...] in tests to satisfy TS “possibly undefined”.
  - Result: typecheck/build/docs no longer flag errors for the new test and plugin,
    while vitest continues to pass. This keeps the build pipeline green given
    tsconfig.rollup.json includes src/\*_/_.ts and compiles test sources.

- Fix host method binding in plugin:
  - Updated install() to invoke host.addCommand / host.registerCommand /
    host.command via .call(host, …) to preserve `this` for class-based hosts.
  - Prevents silent registration failure in tests where methods rely on `this`,
    resolving the remaining vitest assertion on missing commands.

- Spawn-env normalization (first pass):
  - Introduced a reusable helper (src/cli/util/spawnEnv.ts) that prefers get-dotenv’s
    buildSpawnEnv when available and falls back to prior normalization.
  - Wired into inline (tsx), serverless-offline runner, and the OpenAPI builder spawn
    so child processes inherit normalized env. Behavior remains identical where get-dotenv
    is absent or inert.

- Delegate cmd/batch to get-dotenv host:
  - Added an adapter that invokes the plugin-first host when the subcommand is
    `cmd` or `batch`, passing a branding string (“<pkg> v<version>”).
  - Leaves existing smoz commands intact; next step is to install smoz plugins on
    the host and route all CLI through it.

- Fix get-dotenv host delegation (exactOptionalPropertyTypes):
  - Updated the adapter to include the optional `branding` field only when defined,
    eliminating TS2379 errors during typecheck/build/docs.

- Dev loop stage precedence (implemented):
  - Introduced resolveStage() with precedence: --stage > getdotenv.config.json plugins.smoz.stage > env.STAGE > inferred default ("dev").
  - runDev now uses resolveStage; existing behavior preserved when config is absent.

- Normalize serverless-offline child env via get-dotenv:
  - serverless-offline launcher now builds child process env using buildSpawnEnvMaybe;
  - verbose logs include a snapshot of normalized temp/home variables; fallback behavior unchanged.

- Host skeleton (opt-in):
  - Added a minimal get-dotenv host wrapper (src/cli/host/index.ts) and a placeholder
    smoz plugin module (src/cli/plugins/smoz.ts).
  - CLI entry can route all commands through the host when SMOZ_HOST=1 is set,
    preserving default behavior otherwise. Future iterations will install the AWS base
    plugin and register smoz commands on the host by default.

- Host skeleton housekeeping:
  - Referenced the skeleton plugin from the host to satisfy static analysis (knip)
    until full registration is implemented. No behavior change; prepares for the
    upcoming plugin-first host wiring.

- Plugin skeleton cleanup:
  - Removed the default export from src/cli/plugins/smoz.ts to resolve a knip
    duplicate export warning. The named export remains; no behavior change.

- Host path advancement:
  - runWithHost now prefers a real host via get-dotenv createCli when available,
    attaches the placeholder SMOZ plugin, and runs argv; falls back to the safe
    adapter otherwise. Behavior remains opt-in (SMOZ_HOST=1) and unchanged by
    default pending full plugin registration.

- Host opt-in tests:
  - Added src/cli/host/host.optin.test.ts to exercise both createCli-preferred
    and adapter-fallback paths, keeping the host iteration safe without changing
    default CLI behavior.

- Host opt-in test fixes:
  - Resolved ESLint error by removing the unused createCli mock parameter.
  - Adjusted the fallback-branch mock to export `createCli: undefined`, avoiding
    “missing export” mock errors and ensuring the adapter path is exercised.

- Project prompt update:
  - Added a get‑dotenv docs‑first policy instructing the assistant to consult
    https://docs.karmanivero.us/get-dotenv before implementing new CLI‑related
    functionality, and to prefer host/plugins over custom code when possible.

- Make host the only path:
  - Simplified src/cli/index.ts to always delegate to the get-dotenv host via runWithHost.
  - Removed the SMOZ_HOST toggle and all legacy direct-command mappings
    (register/openapi/add/init/dev). The host SMOZ plugin is authoritative.
  - On host errors, the CLI exits non-zero instead of falling back. CI and
    local flows now rely solely on the plugin-first host and attached commands.

- Host-only hard fail on errors:
  - Updated src/cli/index.ts to call process.exit(1) on host errors instead of
    setting process.exitCode only. This ensures shell `&&` chains stop when the
    get-dotenv host is unavailable or does not expose a known entry point and
    eliminates any lingering implicit fallback behavior.

- Broaden get-dotenv host adapter compatibility:
  - Expanded src/cli/util/getdotenvHost.ts to probe additional export shapes:
    createCli().run, runCli, run, default (function), default.run, cli.run.
  - Improves resilience across get-dotenv versions/packagers so the host-only
    CLI can execute even when the module exposes a default or nested shape.
  - Error message now includes the probed shapes for easier diagnostics.

- Added interop note: get-dotenv host export surface & probes
  - Documented canonical contract (named createCli), legacy defaults,
    exports map expectations, and a small interop test matrix.