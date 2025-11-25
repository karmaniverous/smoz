# Development Plan

When updated: 2025-11-25T00:00:00Z

## Next up (near‑term, actionable)

- Template: add `dynamodb`
  - Add tables/000 with:
    - entityManager.ts (values-first + schema-first; imports app/domain/user.ts)
    - table.yml with `TableName: ${param:STAGE_NAME}-000`
    - (no transform.ts for 000)
  - Add app/domain/user.ts (authoritative Zod) and reuse it in EM + HTTP
  - Implement users endpoints inline under app/functions/rest/users/\*:
    - GET /users (query-driven search; beneficiaryId, name, phone, createdFrom/To, updatedFrom/To, sortOrder, sortDesc, pageKeyMap)
    - POST /users (create)
    - GET /users/{id} (read)
    - PUT /users/{id} (shallow update semantics)
    - DELETE /users/{id} (delete)
  - serverless.ts resources:
    - Table000: ${file(./tables/000/table.yml)} (later versions added side-by-side)
  - Provider params/env:
    - Add STAGE_NAME = ${SERVICE_NAME}-${STAGE} (duplicated per stage)
    - TABLE_VERSION (public/global)
    - TABLE_VERSION_DEPLOYED (private per env; ${env:TABLE_VERSION_DEPLOYED})
    - TABLE_NAME = ${param:STAGE_NAME}-${param:TABLE_VERSION}
    - TABLE_NAME_DEPLOYED = ${param:STAGE_NAME}-${env:TABLE_VERSION_DEPLOYED}
    - DYNAMODB_LOCAL_ENDPOINT (optional; passed to handlers)

- Default template: seed STAGE_NAME param
  - Add STAGE_NAME = ${SERVICE_NAME}-${STAGE} (best practice; not consumed yet)

- /app fixture: reflect combined feature set
  - Add tables/000 with versioned TableName YAML and resource import
  - Add users endpoints inline (CRUD/search) reusing domain Zod
  - Keep IAM permissive; CI remains package-only (no deploy)
  - Ensure OpenAPI/register flows stay green

- Plugin integration validation in SMOZ
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

## Completed (recent)

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
