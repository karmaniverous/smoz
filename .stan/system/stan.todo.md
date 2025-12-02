# Development Plan

When updated: 2025-11-25T00:00:00Z

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

- Interop note: DDB CLI plugin local orchestration
  - Defined config-first `start|stop|status` commands with native env interpolation
  - Embedded fallback via @karmaniverous/dynamodb-local; `start` blocks until healthy
  - Standardized `DYNAMODB_LOCAL_ENDPOINT` / `DYNAMODB_LOCAL_PORT`
  - Dynamic naming anchored on `STAGE_NAME = ${SERVICE_NAME}-${STAGE}` with versioned TableName `${param:STAGE_NAME}-NNN` in generated YAML
- Plugin docs updated (entity-client-dynamodb)
  - Added “Local DynamoDB” page and linked it in CLI index
  - Updated recipes with local orchestration examples
- Spawn-env usage consolidated
  - SMOZ CLI uses get-dotenv’s `buildSpawnEnv` directly; removed local wrappers
  - Ensured inline/offline/serverless hooks rely on composed envs

- Exclude STAN workspace from tools
  - Vitest: added '**/.stan/**' to test.exclude
  - Knip: added ".stan/\*\*" to ignore
- Fix typecheck in dev inline tests
  - Typed vi.mock factories to Node module shapes (fs/child_process)
- Resolve DeepOverride lint
  - Reworked mapped type to avoid redundant type constituents

- Fix lint in dev inline tests
  - Removed typeof import() type annotations; use local type aliases to satisfy consistent-type-imports

- Default template: seed STAGE_NAME param
  - Add STAGE_NAME = ${SERVICE_NAME}-${STAGE} (not consumed yet)

- DynamoDB template: seed dependencies and CLI
  - Renamed package to smoz-template-dynamodb
  - Added @karmaniverous/smoz as a devDependency (CLI available without ambient mapping)
  - Added entity/client stack deps (@karmaniverous/entity-client-dynamodb, entity-manager, entity-tools, string-utilities) and nanoid

- DynamoDB template: scaffold v000 + domain and wire resources
  - Added app/domain/user.ts (authoritative Zod)
  - Added tables/000/{entityManager.ts, table.yml}
  - Added resources.Resources.Table000 import in template serverless.ts

- Knip: ignore template-only devDeps used for template typecheck
  - Added @karmaniverous/entity-manager and @karmaniverous/entity-tools to knip.json ignoreDependencies
  - Rationale: templates/\*\* are excluded from knip’s project scan; these deps are required only for template typechecking

- Templates lint wiring & TS cast
  - Fixed lint arg forwarding that appended "." to template runs; added explicit
    lint:templates:\*:fix scripts to avoid repo-wide lint with template configs
  - Ensured templates/dynamodb lints with its own flat config (not default's)
  - Cast serverless resources to NonNullable<AWS['resources']> so template
    typecheck surfaces real ESLint errors (e.g., no-unsafe-assignment) instead
    of being blocked by TS2322; normalized LF in that block to satisfy Prettier

- Knip: remove used devDep from ignoreDependencies
  - Dropped @karmaniverous/entity-manager from knip.json ignoreDependencies per configuration hint

- DynamoDB template: add users CRUD/search endpoints
  - Added app/entity/entityClient.ts (env-driven; supports Local endpoint)
  - Added GET /users (search), POST /users (create), GET/PUT/DELETE /users/{id}
  - Reused domain Zod and EntityClient/QueryBuilder; baseline compiles and is ready for extension

- Knip: ignore template-only devDep entity-client-dynamodb
  - Added @karmaniverous/entity-client-dynamodb to knip.json ignoreDependencies

- /app fixture: seed STAGE_NAME stage param (best practice; not consumed yet)

- /app fixture: scaffold domain schema, EntityManager, EntityClient, and add a
  Serverless resource import skeleton for table v000

- /app: implement REST users endpoints (CRUD + search)
  - Typed params via zod overrides in lambda.ts (no in-handler casts)
  - Kept configs minimal (no explicit defaults); explicit basePath only for {id}

- /app: GET /users returns strict domain items (non‑projection)
  - Enriched query results via getItems, removed keys, and shaped response
  - Matches responseSchema { items: z.array(userSchema), pageKeyMap?: string }

- Docs: export HttpPropKeys for Typedoc
  - Exported type from src/types/DeepOverride.ts to remove warning and surface in API docs

- Docs pass (general alignment):
  - `docs-src/templates.md`: Removed reference to obsolete `templates/project` directory and clarified that the `default` template is self-contained.
  - `docs-src/middleware.md`: Restructured the default middleware list to accurately reflect the `before`, `after`, and `onError` execution phases, improving clarity and correctness.
- Docs: Consolidated contributing guides
  - Merged `docs-src/contributing.md` into the root `CONTRIBUTING.md` to create a single source of truth.
  - Updated `typedoc.json` to reference the root `CONTRIBUTING.md` in `projectDocuments`.

- Docs: Consolidated examples into recipes
  - Merged the narrative walkthroughs from the `examples` directory into their corresponding `docs-src/recipes` documents.
  - Transformed the SQS and Step Functions recipes into complete, self-contained guides.
  - Removed the now-redundant `examples` directory and updated `docs-src/recipes/index.md` to remove links to it.
- OpenAPI: Sanitize operationId for path parameters
  - Updated `buildOpenApi.ts` to strip `{}` from path segments when constructing `operationId`.
  - Updated `buildPath.ts` to sanitize `[param]` to `{param}` to handle file-system-native path parameter syntax.
- Refactor app config exports (/app fixture)
  - Removed redundant re-exports of stages/environment from app.config.ts
  - Updated serverless.ts to access `app.stages` and `app.environment` directly