# Development Plan

When updated: 2025-12-28T00:00:00Z

## Next up (near‑term, actionable)

- Align to upstream by‑token typing end state (entity‑manager v8 / client v1)
  - Dependencies:
    - Switch devDependencies to stable ranges once released:
      - @karmaniverous/entity-manager ^8.0.0
      - @karmaniverous/entity-client-dynamodb ^1.0.0
    - Track in CHANGELOG; remove prerelease ranges.
  - Code & templates:
    - Replace any lingering legacy type names with by‑token family:
      - EntityItem / EntityItemPartial, EntityRecord / EntityRecordPartial.
    - Ensure /app GET /users remains a non‑projection enrich → domain path
      (no attributes passed to getItems) so strict types flow without casts.
    - If any template demonstrates projection, keep it explicitly partial and
      document re‑enrichment for strict responses.
  - Tests (compile‑time):
    - Add a ts‑only test that encodes:
      1. Non‑projection: query → keys → getItems → removeKeys assignable to
         z.array(userSchema) (no casts).
      2. Projection: getItems with attributes as const remains partial and is
         not assignable to strict domain.
  - Docs:
    - Update docs and snippets to use by‑token names and clarify projection ergonomics.

- Template extraction (after fixture is green)
  - Extract the proven /app pattern into templates/dynamodb with minimal
    deltas and keep annotations minimal (inference first).
  - Ensure template typechecks without generated registers (ambient declarations).
  - Do not publish until the extracted template mirrors the fixture’s behavior.

- Plugin integration validation in SMOZ
  - (continues; no change)
  - Verify SMOZ wires the DynamoDB plugin (already included) under `aws` and exposes local subcommands:
    - `smoz aws dynamodb local start|stop|status`
    - Config-first behavior with native get-dotenv env interpolation ($DYNAMODB_LOCAL_ENDPOINT / $DYNAMODB_LOCAL_PORT)
    - Embedded fallback via @karmaniverous/dynamodb-local when present
  - SMOZ docs: add a cross-link to plugin docs for Local orchestration

- Tests
  - Ensure Local endpoint switching works when `DYNAMODB_LOCAL_ENDPOINT` is present (mock or integration)
  - Keep template typecheck and lint scripts green

- Docs (SMOZ)
  - Explain dynamic naming and canonical runtime table policy:
    - STAGE_NAME, TABLE_VERSION, TABLE_VERSION_DEPLOYED, TABLE_NAME / TABLE_NAME_DEPLOYED
  - Clarify that tables are created via Serverless deploy (imports) and not by default via CLI create in the template path
  - Note that multiple versioned tables can coexist during migration
  - Cross-link to DynamoDB plugin docs for Local orchestration (config-first vs embedded fallback)

- Facets
  - Phase 2 (templates + fixture + endpoints): activate templates, app, docs, tests, ci
  - Keep examples/diagrams facets inactive
  - Ensure anchors are present so overlays remain intelligible

## Completed

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- Requirements: define CLI composition under get-dotenv v6.2.x
  - Root-mounted SMOZ command plugins (no `smoz smoz ...`)
  - Only get-dotenv init grouped under `getdotenv` and configured to avoid templates
  - Keep cmd/batch/aws at root, omit whoami, nest dynamodb under aws

- Amendment: Drop get-dotenv init plugin from SMOZ requirements; `smoz init`
  owns get-dotenv scaffolding and always writes `getdotenv.config.ts` plus
  `getdotenv.dynamic.ts` (get-dotenv env == SMOZ stage). Add downstream `--cli`
  option to scaffold root `cli.ts` and a `tsx` script.

- CLI: migrate bootstrap to get-dotenv createCli and remove SMOZ JSON-only
  parsing of getdotenv config (stage inference now uses env/app.stages; env
  seeding reads params from app.stages with stage overrides for global keys).

- CLI: refactor SMOZ commands into root-mounted get-dotenv plugins
  (init/add/register/openapi/dev) and add useSmozPlugins installer.

- CLI: add missing smoz dev plugin module to fix typecheck/lint.

- CLI: update createCli branding and useSmozPlugins typing for get-dotenv v6.2.4.

- Tests: increase inline server startup timeout and fail fast on spawn errors.

- CLI: make useSmozPlugins structurally typed to avoid nominal mismatches.

- Lint: remove unnecessary String() conversion in inline server test.

- Docs: record owned-deps no-web-search policy in stan.project.md.

- Plan: prune completed items from “Next up”.

- CLI: mount aws/dynamodb plugin (entity-client-dynamodb) under `smoz aws`.

- Init: always seed get-dotenv config + dynamic, and add optional `--cli`
  local cli.ts scaffolding plus a `cli` script.
- Tests: add /app EntityClient env resolver coverage and a compile-time
  by-token inference guard (strict non-projection; partial projection).

- Tests: add CLI help coverage for aws/dynamodb local commands.

- Tests: fix aws/dynamodb help test invocation (argv).

- Tests: make aws/dynamodb help test deterministic (no dist).

- Tests: extend aws/dynamodb help test timeout and diagnostics.

- Verification: vitest run passes on Windows; aws/dynamodb help integration test
  completes within the per-test/spawn timeouts and emits actionable diagnostics.
