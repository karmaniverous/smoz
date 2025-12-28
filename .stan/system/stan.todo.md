# Development Plan

When updated: 2025-12-28T00:00:00Z

## Next up (near‑term, actionable)

- Unblock CLI execution (owned deps)
  - get-dotenv: investigate/fix `Plugin config not available` crash triggered
    by SMOZ `createCli(...).run(argv)` during `resolveAndLoad()`.
  - entity-client-dynamodb: ensure local/dev installs provide the published
    `dist/mjs/index.js` entry referenced by its exports (inline server test).

- CLI composition: adopt get-dotenv v6.2.x plugin model
  - Provide a convenience installer for downstream reuse:
    - e.g., `useSmozPlugins(cli)` mounts the default SMOZ plugin set.
  - Keep shipped get-dotenv plugins in their usual root configuration:
    - `cmd` (as default), `batch`, `aws`
    - Omit whoami (do not install `awsWhoamiPlugin`).
  - get-dotenv init plugin is not part of SMOZ. SMOZ owns init scaffolding.
  - Compose DynamoDB plugin nested under aws:
    - `smoz aws dynamodb ...` with config keyed under `plugins['aws/dynamodb']`.
  - Remove any direct parsing of get-dotenv config files from SMOZ (no JSON-only probes); rely on get-dotenv host ctx and plugin config APIs.

- smoz init: always scaffold get-dotenv config (DX-first)
  - Generate `getdotenv.config.ts` and `getdotenv.dynamic.ts` in the downstream app root.
  - Wire dynamic derivations (STAGE, STAGE_NAME, TABLE_NAME, TABLE_NAME_DEPLOYED) in `getdotenv.dynamic.ts`.
  - Treat get-dotenv env as SMOZ stage.
  - Add `--cli` option to scaffold a downstream `cli.ts` (exact copy of default SMOZ CLI) and add `"cli": "tsx cli.ts"` to package.json.

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

- Fixture-first: implement DynamoDB + EntityManager in /app
  - Domain schema: add app/domain/user.ts (authoritative Zod).
  - EntityManager: add app/tables/000/entityManager.ts (values‑first literal,
    as const; reuse domain schema).
  - EntityClient: add app/entity/entityClient.ts; honor DYNAMODB_LOCAL_ENDPOINT
    to target Local automatically when present.
  - Endpoints in app/functions/rest/users/\* (match demo semantics; minimal
    annotation – inference should flow end‑to‑end):
    - GET /users (SearchUsersParams: beneficiaryId, name, phone, createdFrom/To,
      updatedFrom/To, sortOrder, sortDesc, pageKeyMap)
    - POST /users (create)
    - GET /users/{id} (read)
    - PUT /users/{id} (shallow update; null deletes optional props)
    - DELETE /users/{id} (delete)
  - Serverless resources: import app/tables/000/table.yml; TableName =
    ${param:STAGE_NAME}-000. Ensure stage params include STAGE_NAME where
    appropriate.
  - Tests: prove inference (no local casts) and behavior (QueryBuilder routes,
    pageKeyMap round‑trip, shallow update semantics). Add a guarded Local
    smoke test or mocks for endpoint switching via DYNAMODB_LOCAL_ENDPOINT.

- Template extraction (after fixture is green)
  - Extract the proven /app pattern into templates/dynamodb with minimal
    deltas and keep annotations minimal (inference first).
  - Ensure template typechecks without generated registers (ambient declarations).
  - Do not publish until the extracted template mirrors the fixture’s behavior.

- /app fixture: reflect combined feature set
  - Add tables/000 with versioned TableName YAML and resource import
  - Add users endpoints inline (CRUD/search) reusing domain Zod
  - Keep IAM permissive; CI remains package-only (no deploy)
  - Ensure OpenAPI/register flows stay green

- Plugin integration validation in SMOZ
  - (continues; no change)
  - Verify SMOZ wires the DynamoDB plugin (already included) and local subcommands:
    - `smoz dynamodb local start|stop|status`
    - Config-first behavior with native get-dotenv env interpolation ($DYNAMODB_LOCAL_ENDPOINT / $DYNAMODB_LOCAL_PORT)
    - Embedded fallback via @karmaniverous/dynamodb-local when present
  - SMOZ docs: add a cross-link to plugin docs for Local orchestration

- Tests
  - Add baseline unit tests for at least one handler and the search route logic
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

- Interop: document get-dotenv plugin-config crash under .stan/interop.

- Interop: document entity-client-dynamodb missing dist/mjs under .stan/interop.
