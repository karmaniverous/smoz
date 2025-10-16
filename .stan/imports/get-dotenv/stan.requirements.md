# Project Requirements — get-dotenv

When updated: 2025-10-16T00:00:00Z

## Overview

This document captures durable, project-level requirements for get-dotenv. It consolidates all product requirements that were previously intermingled in the project prompt. Assistant/policy instructions live in stan.project.md; keep requirements here.

## Product positioning (summary)

Where it shines:

- Deterministic dotenv cascade across paths with public/private/global/env axes.
- Progressive, recursive expansion with defaults; dynamic vars in JS/TS (safe).
- Plugin-first host with once-per-invocation context and typed options.
- Cross-platform command execution (argv-aware shell-off; normalized shells).
- CI-friendly capture and `--trace` diagnostics.

Who will love it:

- Platform/DX/DevOps teams in monorepos.
- Tooling/CLI authors composing domain plugins.
- CI/CD engineers needing deterministic env and observability.
- Cross-platform app teams (Windows + POSIX).

## Mission

Load environment variables from a configurable cascade of dotenv files and/or explicit variables, optionally expand variables recursively, optionally inject into `process.env`, and expose a flexible CLI that can act standalone or as the foundation for child CLIs. Backward compatibility with the existing public API and behaviors is required.

## Compatibility policy (plugin-first vs generated CLI)

- The plugin-first shipped CLI may evolve without strict backward compatibility.
- The legacy generated CLI (via generateGetDotenvCli) MUST preserve existing flags/behavior for consumers. Changes to flag names or behavior in the plugin-first CLI do not imply changes to the generated CLI unless explicitly coordinated as a breaking change for that surface.

## Supported Node/Runtime

- Node: >= 20
- ESM-first package with dual exports:
  - import: dist/index.mjs (types: dist/index.d.mts)
  - require: dist/index.cjs (types: dist/index.d.cts)

## Tooling

- Build: Rollup
- TypeScript: strict; ESM module
- Lint: ESLint v9 (flat config), Prettier formatting
- Test: Vitest with V8 coverage

## Core behaviors (must be preserved)

### 1) Dotenv cascade and naming (public/private/global/env)

- Public globals: `<token>` (e.g., `.env`)
- Public env: `<token>.<env>`
- Private globals: `<token>.<privateToken>`
- Private env: `<token>.<env>.<privateToken>`
- Defaults:
  - `dotenvToken`: `.env`
  - `privateToken`: `local`
  - Paths default to `["./"]` unless explicitly overridden (backward compatible).

### 2) Option layering (defaults semantics, “custom overrides defaults”)

- CLI generator defaults resolution (`generateGetDotenvCli`):
  - Merge order (lowest precedence first): base < global < local < custom
- getDotenv programmatic defaults (`resolveGetDotenvOptions`):
  - Merge order: base (from CLI defaults) < local (getdotenv.config.json) < custom
- Per-subcommand merges (nested CLI):
  - Merge order: parent < current (current overrides).
- Behavior: “defaults-deep” semantics for plain objects (no lodash required).

### 3) Variable expansion

- Recursive expansion with defaults:
  - `$VAR[:default]` and `${VAR[:default]}`
- Unknown variables resolve to empty string.
- Progressive expansion supported where later values may reference earlier results.

### 4) Dynamic variables

- `dynamicPath` default-exports a map of:
  - key → function(dotenv, env?) => value, or
  - key → literal value
- Functions evaluate progressively (later keys can depend on earlier).
- Backward compatibility: JS modules remain the simplest path.
- Optional TypeScript support (see “Dynamic TypeScript” below).

### 5) CLI execution and nesting

- The base CLI can execute commands via `--command` or the default `cmd` subcommand.
- Shell resolution:
  - If `shell === false`, use Execa plain (no shell).
  - If `shell === true` or `undefined`, use default OS shell:
    - POSIX: `/bin/bash`
    - Windows: `powershell.exe`
  - If `shell` is a string, use that shell.
  - Script-level overrides (`scripts[name].shell`) take precedence for that script.
- Nested CLI:
  - Outer context is passed to inner commands via `process.env.getDotenvCliOptions` (JSON).
  - Within a single process tree (Commander), the current merged options are placed on the command instance as `getDotenvCliOptions` for subcommands.

#### CLI flag standardization (plugin-first host)

- Use “-c, --cmd <command...>” provided by the cmd plugin as the parent-level option alias. The shipped CLI does not include a root “-c, --command” flag.
- The legacy generated CLI retains “-c, --command <string>” for compatibility and uses its own command wiring as documented in the generator entry.

#### Command alias on parent (cmd)

The CLI MUST support two equivalent ways to execute a command:

1. Subcommand: `cmd [args...]` (positional arguments are joined verbatim),
2. Option alias on the parent: `-c, --cmd <command...>` (variadic, joined with spaces).

Notes and guidance:

- Prefer the alias for npm scripts so flags after `--` are routed to getdotenv:
  - Anti-pattern: `"script": "getdotenv echo $FOO"` (flags passed to `npm run script -- ...` are applied to `echo`, not to `getdotenv`).
  - Recommended: `"script": "getdotenv -c 'echo $FOO'"`, then `npm run script -- -e dev` applies `-e` to getdotenv itself.
- Scripts and shell precedence is unchanged:
  - `scripts[name].shell` (object form) overrides the global `shell` for that script.
- Scope: For the new plugin-first CLI, the alias is owned by the cmd plugin and attaches to the parent; the old generated CLI retains its original `-c, --command` until a deliberate breaking change is published.

#### Shell expansion guidance (procedural)

- Outer shells (e.g., bash, PowerShell) may expand variables before Node receives argv. Document quoting rules and recommend single quotes for `$FOO` on POSIX and single quotes on PowerShell to suppress outer expansion. Prefer `"getdotenv -c '...'"` in npm scripts.
- Future optional safety nets may include `--cmd-file <path>` (read command from file) or env-backed alias (`GETDOTENV_CMD`) to avoid outer-shell expansion entirely.

## Prioritized roadmap (requirements)

Must-have (near-term):

1. Batch concurrency (opt-in)
   - Flag: `--concurrency <n>` (default 1).
   - Aggregate output by job; buffered flush; end-of-run summary.
   - Optional `--live` for prefixed interleaved streaming.
   - Respect per-script hints: `scripts[name].parallel?: boolean`, `concurrency?: number`.
2. Redacted logging/tracing
   - `--redact` with default masks (SECRET, TOKEN, KEY, PASSWORD); allow custom patterns.
   - Apply to `-l/--log` and `--trace`.
   - Entropy warnings (warning-only; no masking):
     - Purpose: Provide a low-risk signal for likely secrets without altering values or masking by default. Keeps observability high while nudging safer workflows.
     - Surfaces:
       - `--trace`: emit an extra stderr line per affected key (at most once per key per run).
       - `-l/--log`: same warning policy (since values are printed).
     - Trigger gating:
       - Only evaluate entropy when cheap prefilters pass:
         - Length ≥ `minLen` (default 16).
         - Character-class: printable ASCII (skip obvious low-entropy human text).
       - Compute Shannon entropy (over character frequencies); warn when bits/char ≥ `threshold` (default 3.8).
     - Warning format (no value preview to avoid leakage):
       - Single concise stderr line:
         ```
         [entropy] key=<NAME> score=<X.XX> len=<N> origin=<dotenv|parent>
         ```
     - No redaction:
       - Diagnostic-only. Never alters the environment or output; coexists with deterministic masking (names/regexes) as a separate, opt-in feature.
     - Noise control:
       - Once-per-key-per-run to avoid spam.
       - Optional end-of-run summary may be added later; not required for v1.
     - CLI flags:
       - `--entropy-warn` / `--no-entropy-warn` (default: on).
       - `--entropy-threshold <bitsPerChar>` (default: 3.8).
       - `--entropy-min-length <n>` (default: 16).
       - `--entropy-whitelist <pattern>` (repeatable; regex or glob-like) to suppress warnings by key name.
     - Config mirrors:
       ```json
       {
         "warnEntropy": true,
         "entropyThreshold": 3.8,
         "entropyMinLength": 16,
         "entropyWhitelist": ["^GIT_", "^npm_", "^CI$", "SHLVL"]
       }
       ```
     - Performance:
       - Compute entropy only after prefilters pass; omit base64 heuristics. Cost is tiny for a handful of keys.
     - Safety defaults:
       - Default warn ON for both `--trace` and `-l/--log`.
3. Required keys / schema checks
   - Validate final env against a declared keys list or schema (JSON/YAML/TS).
   - Fail-fast with helpful diagnostics.
4. Shell completion
   - Generate bash/zsh/pwsh completion for flags/subcommands.

Nice-to-have (next):

5. First-party secrets provider plugins (AWS/GCP/Vault).
6. Watch mode for local dev (recompute on file changes; optional command rerun).
7. Enhanced `--trace` diff (origin/value/overridden-by).
8. Troubleshooting doc (common shell pitfalls and quoting recipes).

## Architecture: Plugin-first CLI host and schema-driven config (vNext additive)

Purpose

- Introduce a plugin-first CLI host that composes environment-aware CLIs. It validates options strictly, resolves dotenv context once per invocation, and exposes lifecycle hooks for plugins.

### Architectural split

- Core service (unchanged):
  - getDotenv(options): deterministic env resolution engine.
  - File cascade and dotenv expansion semantics preserved.

- New CLI host (additive):
  - class GetDotenvCli extends Commander.Command.
  - Responsibilities:
    - Discover and layer configs (packaged root → consumer repo global → consumer repo .local → invocation).
    - Validate and normalize options with Zod (raw → resolved).
    - Resolve env with getDotenv and attach a per-invocation context.
    - Expose a plugin API to register commands/subcommands.
  - Context:
    - ctx = { optionsResolved, dotenv, plugins?: Record<string, unknown> }.
    - Produced once per invocation in a preSubcommand hook.
    - If `loadProcess` is true, merge ctx.dotenv into process.env; regardless, plugins can read ctx.dotenv and pass it explicitly to subprocesses.

- Plugin API:
  - definePlugin({ id?, setup(cli), afterResolve?(cli, ctx) }): Plugin.
  - Composition:
    - plugin.use(childPlugin): returns the parent for chaining; the host installs children first, then parent.
  - Setup phase: register commands under the host (e.g., cli.ns('aws').command(...)).
  - AfterResolve phase: initialize clients/secrets using ctx.dotenv or previously-attached plugin state (e.g., AWS creds), then attach to ctx.plugins (namespaced by convention).

- Built-in commands as plugins:
  - Batch command refactored to a plugin (first target).
  - Cmd subcommand may also be offered as a plugin.
  - The shipped getdotenv CLI can be implemented internally by installing these plugins, preserving user-facing behavior.

### Zod schemas (single source of truth)

- Raw vs Resolved:
  - Raw schemas: all fields optional (undefined = inherit).
  - Resolved schemas: service-boundary contracts after defaults/inheritance.
- Schemas:
  - getDotenvOptionsSchemaRaw/Resolved
  - getDotenvCliOptionsSchemaRaw/Resolved (extends programmatic shapes with CLI string fields and splitters)
  - getDotenvCliGenerateOptionsSchemaRaw/Resolved (extends CLI with generator fields)
- Types:
  - export type GetDotenvOptions = z.infer<typeof getDotenvOptionsSchemaResolved>
  - export type GetDotenvCliOptions = z.infer<typeof getDotenvCliOptionsSchemaResolved>
  - export type GetDotenvCliGenerateOptions = z.infer<typeof getDotenvCliGenerateOptionsSchemaResolved>
- Validation policy:
  - New host: strict (schema.parse).
  - Legacy paths: staged “warn” via safeParse → log (no throws) unless explicitly opted-in to strict.

### Config system (additive)

- Packaged root defaults (library root):
  - getdotenv.config.json|yaml|yml|js|ts at package root.
  - No `.local` at package level; no parent above it.
  - Must validate under schemas; missing required defaults are fatal (packaging error).

- Consumer repo configs (project root):
  - Public: getdotenv.config.{json|yaml|yml|js|ts}
  - Local (gitignored): getdotenv.config.local.{json|yaml|yml|js|ts}
  - JSON/YAML: pure data only.
  - JS/TS: may export `dynamic` (GetDotenvDynamic) and optional CLI-level hooks if retained.

- Config-provided values as an alternative to .env files (pure data):
  - vars?: Record<string, string> (global, public)
  - envVars?: Record<string, Record<string,string>> (per-env, public)
  - Private values live in .local configs with the same keys (privacy derives from filename).
  - These insert into env overlay with three axes:
    1. kind: dynamic > env > global
    2. privacy: local > public
    3. source: config > file
  - Programmatic dynamic remains the top of the dynamic tier.

- Dynamic from config (JS/TS only):
  - `dynamic?: GetDotenvDynamic` permitted only in JS/TS configs.
  - Order among dynamics (highest → lowest):
    - programmatic dynamic (passed to getDotenv)
    - config dynamic (JS/TS configs; .local still prioritized via privacy within the “config” source)
    - file dynamic (dynamicPath)

### Backward compatibility

- Preserve existing surfaces:
  - getDotenv(options): no signature/semantic changes.
  - Shipped getdotenv CLI: same flags, help text (wording may be clarified), behavior and outputs.
  - generateGetDotenvCli(...) remains available; may be backed internally by the new host but must be functionally identical.
- New host (GetDotenvCli) and plugins: additive; legacy users are unaffected unless they opt in.
- Config formats:
  - Legacy path continues to accept current JSON; loader can be staged to accept YAML/JS/TS + .local as an additive improvement behind a guard.

## Concurrency policy (design)

- Default execution for `batch` is sequential for safety and legibility.
- Concurrency is explicit and opt-in:
  - `--concurrency <n>` enables a pool (n workers). Default remains 1.
  - When `n > 1`, force capture and aggregate per-job output (buffer, then flush).
  - Write full logs per job to `.tsbuild/batch/<run-id>/<sanitized-path>.{out,err}.log`.
  - Provide `--live` to stream interleaved updates with `[cwd]` prefixes (optional).
- Failure policy:
  - Honor `--ignore-errors`. When false (default), bail early on first failure or stop launching new jobs; print a summary.
  - When true, run all and summarize at the end.
- Per-script hints:
  - Extend scripts entries with `parallel?: boolean` and `concurrency?: number`.
  - When hints are present, they override the global concurrency for that script (e.g., force sequential for heavy tasks like `npm install`).

## AWS base plugin (plugin-first host)

Purpose

- Provide a minimal “auth context” for AWS that other plugins can rely on, without bundling any domain logic (e.g., secrets, SQS, etc.) and without adding an AWS SDK dependency here.
- Works only with the plugin-first host (GetDotenvCli definePlugin). The generated CLI path is explicitly out of scope; existing projects using it will continue to own their AWS wiring until they migrate to the host.

Behavior (no commands)

- Implemented as a base plugin with no commands. It runs once per invocation in `afterResolve`, after dotenv overlays/config have been applied.
- It resolves profile/region, acquires credentials (supporting SSO and non‑SSO profiles), publishes them to process.env when enabled, and mirrors them into `ctx.plugins.aws` for programmatic consumers.

Inputs and where they come from

- Values may come from dotenv (public/local) or getdotenv config (JSON/YAML/TS/JS):
  - Profiles typically live in local dotenv per environment (e.g., `.env.local`, `.env.dev.local`), since they are developer‑machine specifics.
  - Region is non‑secret and may live in public dotenv or config.
  - The plugin reads the already‑resolved dotenv (`ctx.dotenv`) first, then optional config overrides under `plugins.aws`.

Resolution precedence

- Profile:
  1. `plugins.aws.profile` (explicit override in getdotenv config)
  2. `ctx.dotenv['AWS_LOCAL_PROFILE']` (default key)
  3. `ctx.dotenv['AWS_PROFILE']` (fallback key)
  4. undefined (no profile; acquisition is skipped)
- Region:
  1. `plugins.aws.region` (explicit override)
  2. `ctx.dotenv['AWS_REGION']` (default key)
  3. If a profile was resolved and region is still missing, best‑effort `aws configure get region --profile <profile>`
  4. `plugins.aws.defaultRegion` (optional fallback)
  5. undefined
- Advanced (optional) key renames:
  - `plugins.aws.profileKey` (default `'AWS_LOCAL_PROFILE'`)
  - `plugins.aws.profileFallbackKey` (default `'AWS_PROFILE'`)
  - `plugins.aws.regionKey` (default `'AWS_REGION'`)
    Most teams can ignore these and use defaults.

Credentials acquisition (SSO and non‑SSO)

- Env‑first: if `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are already set in `process.env` (e.g., provided by CI or earlier tooling), use them and stop.
- Otherwise, when a `profile` is present and strategy is enabled:
  1. Try CLI export (works for SSO, role, and static profiles on modern AWS CLI):
     `aws configure export-credentials --profile <profile>` (no shell; argv array).
     If it succeeds, use the returned creds.
  2. If export fails:
     - Detect SSO hints for the profile (best‑effort, e.g., `sso_session`, `sso_start_url`).
     - If it appears SSO and `plugins.aws.loginOnDemand === true`, run `aws sso login --profile <profile>` (once), then retry export once.
     - If not SSO (static profile) or login is disabled, fall back to static reads:
       `aws configure get aws_access_key_id/secret_access_key/session_token` with `--profile <profile>`.
- If none of the above produce credentials, leave env untouched and do not publish a credentials bag (plugin is inert).

Publishing outputs

- `setEnv` (default true): when enabled, the plugin writes the resolved values to `process.env`:
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN?`
  - `AWS_REGION` (and optionally `AWS_DEFAULT_REGION` for broader compatibility)
- `addCtx` (default true): publish a programmatic mirror under `ctx.plugins.aws`:
  ```
  {
    profile?: string,
    region?: string,
    credentials?: {
      accessKeyId: string,
      secretAccessKey: string,
      sessionToken?: string
    }
  }
  ```

Configuration schema (plugins.aws)

- `profile?: string` (explicit override)
- `region?: string` (explicit override)
- `defaultRegion?: string`
- `profileKey?: string` (default `'AWS_LOCAL_PROFILE'`)
- `profileFallbackKey?: string` (default `'AWS_PROFILE'`)
- `regionKey?: string` (default `'AWS_REGION'`)
- `strategy?: 'cli-export' | 'none'` (default `'cli-export'`)
- `loginOnDemand?: boolean` (default `false`): only attempts `aws sso login` when export just failed and the profile appears to be SSO; never logs in when creds are already valid.
- `setEnv?: boolean` (default `true`)
- `addCtx?: boolean` (default `true`)

Notes

- No commands are registered by this base plugin; domain plugins (e.g., a wrapped Secrets Manager plugin) can be installed separately and will consume the env/ctx provided by this base.
- The plugin keeps no AWS SDK runtime dependency; downstream libraries may bring SDKs as needed.
