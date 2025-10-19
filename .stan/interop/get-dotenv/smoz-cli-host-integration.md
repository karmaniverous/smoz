# SMOZ × getdotenv — Host/Plugin Integration Note

Purpose

- Propose and converge on a stable design for running the SMOZ CLI as a getdotenv host with SMOZ subcommands implemented as getdotenv plugins.
- Capture layered env resolution, per‑layer interpolation, Zod validation, tracing/redaction/entropy features, and SMOZ‑specific stage handling.
- Keep SMOZ backward compatible: same commands, flags, outputs, and exit codes.

Scope

- SMOZ becomes a getdotenv host. Each existing SMOZ command is a plugin:
  - init, add, register, openapi, dev
- No change to command names/flags/behavior unless noted as opt‑in.
- getdotenv core gains:
  - Layered resolution with per‑layer interpolation
  - Zod env validation and/or requiredKeys
  - Key alias facility (copy src→dest when dest unset)
  - Centralized spawn env normalization helper
  - Trace + redaction + entropy warnings in diagnostics

Non‑goals (initial)

- Inventing env‑name overlays; we prefer simple key aliasing and interpolation
- Moving SMOZ’s app‑config seeding into getdotenv; SMOZ keeps it as a backstop

---

## Architecture Overview

1) SMOZ CLI entry constructs a getdotenv host and installs the SMOZ plugins (init, add, register, openapi, dev).
2) getdotenv resolves env once via a layered pipeline (see below) and publishes a context (ctx).
3) Each plugin runs using the merged options (config defaults → CLI overrides) and ctx.env.
4) SMOZ dev still seeds env from app.config only for missing keys to preserve “provider parity.”

---

## Layered Resolution (with per‑layer interpolation)

Inputs

- BaseEnv: snapshot of process.env at startup
- CLI selection: -e <envName>
- Config: getdotenv.config.{json|yaml|js|ts}

Pipeline (ordered; each layer can interpolate using the env as of that layer)

1) Dotenv overlays (selected by -e)
   - Load .env, .env.local, .env.<env>, .env.<env>.local (or whatever cascade the host defines).
   - Perform dotenv expansion inside dotenv files.
   - Merge into Env.

2) Key aliases (optional; simple copy)
   - Config `keyAliases`: copy src→dest when dest is unset (no override by default).
   - Shapes:
     - `"keyAliases": { "ENV": "STAGE" }` (one→one)
     - `"keyAliases": { "ENV": ["STAGE", "APP_ENV"] }` (one→many)
   - Merge into Env.

3) Config data overlays (public `vars`, per‑env `envVars`)
   - Apply string values with interpolation against the current Env:
     - Interpolation syntax: `${VAR}` and `${VAR:default}` (same as dotenv expansion semantics).
   - Merge into Env.

4) Programmatic dynamic (JS/TS only; optional)
   - `dynamic?: (env) => Record<string, string>` or a map of key→function/literal.
   - Evaluate with the current Env; merge results.

5) Plugin defaults (interpolation allowed)
   - Parse plugin options from config; interpolate string values with the current Env.
   - Example:
     ```json
     {
       "plugins": {
         "smoz": {
           "stage": "${ENV:dev}"
         }
       }
     }
     ```

6) CLI options
   - Merge CLI flags over plugin defaults (normal precedence).
   - Example (SMOZ dev): `--stage` overrides configured `plugins.smoz.stage`.

7) Validation (Zod and/or requiredKeys)
   - After env is fully resolved (steps 1–6), validate:
     - `requiredKeys: string[]` presence checks; and/or
     - `schema: z.ZodObject` for strong validation.
   - Policy:
     - Warn by default; `--strict-env` converts errors to failures (exit 1).
     - Optional “coerce” mode (future): only if explicitly requested.

8) Context
   - Publish `ctx.env` (frozen copy), merged options, list of loaded files, and trace (if enabled) to plugins.

Notes

- Interpolation occurs when a layer is applied; we do not recursively re‑interpolate earlier layers.
- A second alias pass is not needed for determinism; if teams want aliasing based on dynamic outputs, they can alias at the config layer via `vars` with interpolation.

---

## Zod Validation (in getdotenv core)

Motivation

- Both SMOZ and getdotenv already depend on Zod; schema validation belongs close to resolution.

Design

- Config (JS/TS): export a Zod schema directly.
- Config (JSON/YAML): support `requiredKeys: string[]` as a simple presence check.
- CLI flags:
  - `--strict-env` to fail instead of warn.
  - (Optional) `--coerce-env` to opt into coercion, if we add it later.

Example (JS/TS config)

```ts
export const schema = z.object({
  REGION: z.string().min(1),
  SERVICE_NAME: z.string().min(1),
  STAGE: z.enum(['dev', 'qa', 'prod']).optional(),
});
```

Example (JSON)

```json
{ "requiredKeys": ["REGION", "SERVICE_NAME"] }
```

---

## Diagnostics: Trace, Redaction, Entropy (in getdotenv core)

- Trace (`--trace`):
  - Show which dotenv/config files were loaded and in what order.
  - For each key changed, print a short “origin” note (masked; no values unless explicitly allowed).

- Redaction:
  - Mask common secret patterns in any printed values (SECRET, TOKEN, KEY, PASSWORD). Make patterns configurable.

- Entropy warnings:
  - Optional, once‑per‑key warnings in verbose/trace contexts to flag high‑entropy values (diagnostic only; do not mask by default).
  - Tunables: `warnEntropy`, `entropyThreshold`, `entropyMinLength`, `entropyWhitelist`.

---

## Spawn Env Normalization (in getdotenv core)

Utility

```ts
buildSpawnEnv(base: NodeJS.ProcessEnv, opts?: { normalizeTemp?: boolean }): NodeJS.ProcessEnv
```

Behavior

- Normalize TMPDIR/TEMP/TMP; HOME/USERPROFILE defaults per platform.
- Merge Env from ctx; return a clean map for child processes.
- Used by core cmd plugin; exported for downstreams. SMOZ (inline/offline) uses it for tsx and serverless spawns.

---

## SMOZ‑Specific Semantics

Stage: remove duplication, keep a single source of truth

- Do not store `STAGE` inside `stage.params` in app.config. Keep `stage.params` for real per‑stage values only (e.g., `DOMAIN_NAME`, `DOMAIN_CERTIFICATE_ARN`, etc.).
- Serverless packaging:
  - Provide STAGE via provider.environment from the Serverless stage:
    - `STAGE: ${sls:stage}` (or `${opt:stage, "dev"}`)
- SMOZ dev:
  - Resolve stage via precedence (see below), then ensure `process.env.STAGE` is set if missing (backstop for handlers).

Stage resolution precedence (SMOZ dev)

1) `--stage` (CLI wins)
2) `plugins.smoz.stage` from config (after interpolation)
3) `process.env.STAGE` (from dotenv or keyAliases)
4) Default inference (first non‑"default" stage; else "dev")

Example config (deriving stage from ENV)

```json
{
  "plugins": {
    "smoz": {
      "stage": "${ENV:dev}"
    }
  }
}
```

This keeps `-e` strictly as “select dotenv overlays”; if `.env.dev` sets `ENV=dev`, the config derives `stage=dev` with `${ENV:dev}`.

---

## Key Aliases vs. Env‑Name Overlays

Preferred default

- **Key aliases** (copy values): `"keyAliases": { "ENV": "STAGE" }`
  - Simple, explicit, environment‑agnostic, and composes with dotenv practice.
  - Copies happen only when the destination is unset.

When env‑name overlays might still help

- If a project does not (or cannot) keep a source key (e.g., `ENV`) in dotenv, but still wants `-e production` to imply `STAGE=prod` without editing dotenv files.
- This can be added later as a separate, opt‑in feature; not required for SMOZ integration.

---

## Backward Compatibility (SMOZ)

- Command names, flags, outputs, and exit codes remain unchanged.
- No adoption of getdotenv “cmd alias” to avoid naming conflicts with SMOZ subcommands.
- Dev seeding from app.config remains as a backstop (fill only missing keys) to preserve provider‑like parity.
- Teams can opt into richer getdotenv features (validation, tracing, keyAliases) without needing to touch SMOZ.

---

## Examples

Config (JSON) — stage via ENV, key alias, required keys

```json
{
  "requiredKeys": ["REGION", "SERVICE_NAME"],
  "keyAliases": { "ENV": "STAGE" },
  "plugins": {
    "smoz": { "stage": "${ENV:dev}" }
  }
}
```

Config (TS) — Zod schema

```ts
import { z } from 'zod';
export const schema = z.object({
  REGION: z.string().min(1),
  SERVICE_NAME: z.string().min(1),
  // STAGE optional — SMOZ will derive from CLI/config/env or inference
  STAGE: z.enum(['dev', 'qa', 'prod']).optional(),
});
```

---

## Tests (high‑level)

- Layering order and interpolation points:
  - dotenv → aliases → config.vars/envVars (interpolated) → dynamic → plugin defaults (interpolated) → CLI
- Key alias behavior (no override; one→one; one→many)
- Plugin default interpolation using `${ENV:dev}`
- Stage precedence in SMOZ dev (CLI wins; config; env; inference)
- Zod validation and requiredKeys (warn vs `--strict-env`)
- Trace output shows file order and masked origin notes
- Spawn env normalization works on POSIX/Windows

---

## Open Questions for getdotenv Assistant

1) Interpolation syntax and timing:
   - Confirm `${VAR}` and `${VAR:default}` applying at each layer is acceptable, with no global re‑interpolation.
2) Zod schema in config:
   - We’ll allow Zod only in JS/TS configs; JSON/YAML will use `requiredKeys`.
   - Any objection to keeping validation strictly read‑only by default (no coercion)?
3) Key alias override:
   - Default is “no override”; do we want an advanced form to allow `override: true` per alias?
4) Trace detail level:
   - Any constraints on how verbose per‑key origin notes should be (especially in CI)?

---

## Acceptance Criteria (for both repos)

- getdotenv:
  - Layered pipeline with per‑layer interpolation implemented.
  - Zod/requiredKeys validation supported; `--strict-env` enforced.
  - keyAliases implemented (no override by default).
  - Trace, redaction, and entropy warnings integrated; configurable.
  - spawn env normalization helper exported and used by cmd plugin.

- SMOZ:
  - STAGE removed from `stage.params`; Serverless sets STAGE from stage.
  - SMOZ dev implements the finalized stage precedence and sets `process.env.STAGE` if missing.
  - All commands continue to pass E2E/CI tests unchanged (help, outputs, exit codes).
  - Optional config default `"plugins.smoz.stage": "${ENV:dev}"` works as described.

Once you confirm or adjust the above, we’ll proceed with implementation sequencing (getdotenv core first, then SMOZ host and plugins).
