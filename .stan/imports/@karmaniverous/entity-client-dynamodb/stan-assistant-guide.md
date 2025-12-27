---
title: STAN Assistant Guide
---

# STAN Assistant Guide (for assistants working on this repo)

This guide is for STAN assistants modifying or using this repository’s published library surfaces without importing additional type definitions or documentation from the repo into STAN imports. It is intentionally dense and aims to be complete.

This package has two public entrypoints:

- Base library: `@karmaniverous/entity-client-dynamodb`
- get-dotenv DynamoDB plugin: `@karmaniverous/entity-client-dynamodb/get-dotenv`

Rule: do not import from `src/**` in consumer code; use only package `exports` entrypoints and their documented surfaces.

## Repository quick context (what this repo is)

- This repo provides a DynamoDB client adapter (`EntityClient`) and a fluent query builder (`QueryBuilder`) on top of `@karmaniverous/entity-manager` and AWS SDK v3.
- It also ships a get-dotenv plugin for DynamoDB table lifecycle, migration, and local DynamoDB orchestration under the `/get-dotenv` subpath.
- TypeDoc is a gate: `typedoc.json` includes both entrypoints in `entryPoints` and includes this guide in `projectDocuments`.

## Build and packaging invariants (must keep true)

These are “must stay consistent” constraints; many regressions come from violating them.

- Root entrypoint (`.`) and subpath entrypoint (`./get-dotenv`) are distinct surfaces (Option B). They must not be aliases.
- `package.json` `exports` must point to files that actually exist after `npm run build`:
  - Root JS: `dist/mjs/index.js`, `dist/cjs/index.js`
  - Root types: `dist/index.d.ts`
  - Subpath JS: `dist/mjs/get-dotenv/index.js`, `dist/cjs/get-dotenv/index.js`
  - Subpath types: `dist/get-dotenv/index.d.ts`
- Rollup externals must treat dependency subpath imports as external (example: `@karmaniverous/get-dotenv/cliHost` must not be bundled). Bundling transitive dependencies (notably `execa` → `npm-run-path` → `unicorn-magic`) can break builds.
- Avoid exporting Zod schema constants in the public docs surface unless you truly intend to document their entire inferred `__type` trees; prefer exporting a documented config type and keeping schema values `@internal`.

## Scripts and gates (what “done” means)

From `package.json` scripts:

- `npm run lint` must be clean (no errors; warnings should be treated as “fix” unless explicitly ignored by config).
- `npm run test` must pass (Docker-based tests may be skipped if Docker is unavailable).
- `npm run typecheck` must pass (`tsc && tsd`).
- `npm run docs` must pass with 0 warnings (`typedoc --emit none`), with `typedoc.validation.notDocumented: true`.

## Public API map (what assistants may assume exists)

This section is the “replacement” for importing type definitions from the repo: it lists the exported symbols that matter, grouped by entrypoint and intent.

### Root entrypoint: `@karmaniverous/entity-client-dynamodb`

Source entrypoint: `src/index.ts`

Exports:

- EntityClient API (runtime and types):
  - `EntityClient`
  - `EntityClientOptions`
  - `BatchGetOptions`
  - `BatchWriteOptions`
  - `WaiterConfig`
  - `GetItemOutput` (exported helper type)
  - `GetItemsOutput` (exported helper interface)
  - Low-level helper: `getDocumentQueryArgs` (for adapter/tests)
- QueryBuilder API:
  - `QueryBuilder`
  - `createQueryBuilder`
  - Helpers: `addFilterCondition`, `addRangeKeyCondition`, `attributeValueAlias`
  - Types: `FilterCondition`, `RangeKeyCondition`, `IndexParams`, `QueryCondition*` union interfaces/types
- Tables API:
  - `generateTableDefinition`
  - `TranscodeAttributeTypeMap`
  - `defaultTranscodeAttributeTypeMap`
- Type-only re-exports from `@karmaniverous/entity-manager` for downstream DX:
  - `EntityItem`, `EntityItemPartial`
  - `EntityRecord`, `EntityRecordPartial`
  - `EntityToken`
  - `Projected`

Core “how to use it” principles:

- Token in → narrowed type out: pass literal entity tokens and const projection tuples to preserve inference.
- Domain vs storage: DynamoDB reads return storage records; strip keys via `entityManager.removeKeys(entityToken, recordOrRecords)` when you need domain shapes.

Minimal cookbook:

```ts
import {
  EntityClient,
  generateTableDefinition,
} from '@karmaniverous/entity-client-dynamodb';

const client = new EntityClient({
  entityManager,
  tableName: 'UserTable',
  region: 'local',
});

await client.createTable({
  BillingMode: 'PAY_PER_REQUEST',
  ...generateTableDefinition(entityManager),
});

await client.putItem({ hashKey2: 'h', rangeKey: 'r', a: 1 });

const out = await client.getItem('user', { hashKey2: 'h', rangeKey: 'r' });
const domain = out.Item && client.entityManager.removeKeys('user', out.Item);
```

QueryBuilder usage:

```ts
import { createQueryBuilder } from '@karmaniverous/entity-client-dynamodb';

const qb = createQueryBuilder({
  entityClient: client,
  entityToken: 'user' as const,
  hashKeyToken: 'hashKey2' as const,
});

qb.addRangeKeyCondition('created', {
  property: 'created',
  operator: 'between',
  value: { from: 1700000000000, to: 1900000000000 },
});

const withProjection = qb.setProjection('created', ['created'] as const);
const shardQueryMap = withProjection.build();

const { items, pageKeyMap } = await client.entityManager.query({
  entityToken: 'user',
  item: {},
  shardQueryMap,
  pageSize: 25,
});
```

Projection invariant (adapter behavior):

- When any projection is present, the adapter auto-includes the entity `uniqueProperty` and any explicit sort keys at runtime to preserve dedupe and sort invariants.

### Subpath entrypoint: `@karmaniverous/entity-client-dynamodb/get-dotenv`

Source entrypoint: `src/get-dotenv/index.ts`

Purpose:

- Host-aware get-dotenv plugin + pure services for DynamoDB table lifecycle, migration, and local orchestration.

Exports (grouped by usage):

- Plugin entry:
  - `dynamodbPlugin` (CLI plugin factory; registers commands)
  - `DynamodbPluginInstance` (typed instance seam; used in command registration modules)
- Versioned layout and resolution:
  - `parseVersionValue`, `formatVersionToken`
  - `listVersionDirs`, `listVersionDirEntries`
  - `resolveVersionDir`
  - `getVersionedPathsForToken`
  - `resolveTableFile`, `resolveTransformFile`
  - `resolveEntityManagerFileWithFallback`
  - `enumerateStepVersions`
- EntityManager dynamic loading:
  - `loadEntityManagerFromFile`
  - `resolveAndLoadEntityManager`
- YAML table definition utilities (comment-preserving):
  - `computeGeneratedSections`
  - `composeNewTableYaml`
  - `refreshGeneratedSectionsInPlace`
  - Types: `GeneratedSections`, `OverlayOptions` (creation-time overlay)
- Managed table properties (non-generated keys):
  - `resolveManagedTableProperties`
  - `assertManagedTablePropertiesInvariants`
  - `pickManagedActualFromProperties`
  - Types: `TablePropertiesConfig`, `ManagedTablePropertiesInfo`
- Drift validation:
  - `validateGeneratedSections`
  - Types: `ValidateResult`, `GeneratedDiff`
- Core services (pure; CLI adapters call these):
  - Generate/refresh YAML: `generateTableDefinitionAtVersion`
  - Validate YAML: `validateTableDefinitionAtVersion`
  - Create table: `createTableAtVersion`
  - Delete table: `deleteTable`
  - Purge table: `purgeTable`
  - Migrate data: `migrateData`
  - Local orchestration: `startLocal`, `stopLocal`, `statusLocal`, `deriveEndpoint`
- Transform typing helpers:
  - `defineTransformMap`
  - Types: `TransformMap`, `TransformHandler`, `TransformContext`
- CLI option resolvers (flags > config > defaults; expand flags once):
  - `resolveLayoutConfig`
  - `resolveGenerateAtVersion`, `resolveValidateAtVersion`
  - `resolveCreateAtVersion`, `resolveDelete`, `resolvePurge`, `resolveMigrate`
- CLI parsers (Commander numeric strictness):
  - `parseFiniteNumber`, `parsePositiveInt`, `parseNonNegativeInt`

## get-dotenv plugin: canonical mounting and config model (aws-pattern)

Expected usage is as a child of the shipped get-dotenv `aws` plugin:

- Commands invoked as `aws dynamodb ...`
- Config keyed under `plugins["aws/dynamodb"]` (realized mount path)

Minimal host composition example:

```ts
import { createCli } from '@karmaniverous/get-dotenv';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
import { dynamodbPlugin } from '@karmaniverous/entity-client-dynamodb/get-dotenv';

await createCli({
  alias: 'mycli',
  compose: (p) => p.use(awsPlugin().use(dynamodbPlugin())),
})(process.argv.slice(2));
```

Config interpolation boundary (critical):

- Host interpolates plugin config strings once before plugin code runs.
- Plugin expands runtime flags once (when resolvers choose to), and must not re-expand config-origin strings.

Precedence (every resolver/service adapter must follow):

- CLI flags (expanded once) > plugin config (already interpolated once) > defaults.

Config surface (documented as `DynamodbPluginConfig`):

- `tablesPath`, `tokens.{table,entityManager,transform}`, `minTableVersionWidth`
- `generate.{version,clean,tableProperties}`
- `validate.{version}`
- `create.{version,validate,refreshGenerated,force,waiter.maxSeconds,tableNameOverride}`
- `delete.{tableName,waiter.maxSeconds}`
- `purge.{tableName}`
- `migrate.{sourceTable,targetTable,fromVersion,toVersion,pageSize,limit,transformConcurrency,progressIntervalMs}`
- `local.{port,endpoint,start,stop,status}`

## Versioned layout semantics (tables lifecycle)

Default layout under `tablesPath` (default: `tables`):

```text
tables/
  table.template.yml       (optional baseline)
  001/
    entityManager.ts|.js   (fallback-aware)
    table.yml|.yaml        (full AWS::DynamoDB::Table resource)
    transform.ts|.js       (optional per-step transforms)
```

Numeric ordering rules:

- All version comparisons are numeric, not lexicographic.
- Any digit-only directory name is accepted (`^\d+$`).
- Duplicate numeric values across directories (example: `1/` and `001/`) are a hard error.
- `minTableVersionWidth` is cosmetic padding for formatting tokens when emitting a canonical token; it does not restrict existing dirs.

Fallback EntityManager resolution (per requirements):

- For a requested version V, resolve `entityManager.(ts|js)` by scanning backward across existing version directories whose numeric value is `<= V` until a file is found.
- Used for both “prev” and “next” in step chains; missing ancestry is an error.

## YAML generation/refresh semantics (comment-preserving)

Generated sections:

- `Properties.AttributeDefinitions`
- `Properties.KeySchema`
- `Properties.GlobalSecondaryIndexes`

Rules:

- Refresh replaces only the generated nodes under `Properties`; all other properties and comments are preserved.
- Compose-new uses `tables/table.template.yml` as a baseline if present; otherwise starts from a minimal doc template with a warning banner.

Managed table properties (non-generated keys; optional):

- `Properties.BillingMode`
- `Properties.ProvisionedThroughput`
- `Properties.TableName`

Invariants:

- If throughput is managed, BillingMode must be managed and must be `PROVISIONED`, and both RCU/WCU must be present.
- If BillingMode is managed as `PAY_PER_REQUEST`, `ProvisionedThroughput` must not exist in YAML.

## Drift validation semantics

Validation checks:

- Compare YAML’s generated sections to EntityManager output (order-insensitive canonicalization).
- If managed table properties are configured, validate those keys for drift too and enforce invariants against the effective YAML.

Create flow drift policy:

- Default: validate drift before create.
- `refreshGenerated` updates YAML in place (generated sections + managed properties) before create.
- `force` only bypasses drift failure when validate is enabled; it is not a confirmation mechanism.

Latest-only create guard (safety invariant):

- Creating a non-latest version is rejected by default in all environments.
- Override requires explicit `allowNonLatest: true` (`--allow-non-latest` flag).

## Migration semantics (stepwise chain; bounded memory; strict boundaries)

Boundary existence guard (hard):

- Both `fromVersion` and `toVersion` must exist as version directories or migration errors (never silently no-op).

Step discovery:

- Steps are all versions `k` where `from < k <= to`, ascending numeric order.

Per-step context:

- Resolve `prev` EM (fallback-aware) and `next` EM (fallback-aware).
- Optionally load `transform.(ts|js)` for that step version; missing transform module means default chain for all entities.

Default chain (per record):

- Determine `entityToken` by parsing the global hash key prefix using `prev.config.hashKey` and `prev.config.shardKeyDelimiter` (default delimiter: `!`).
- Convert storage record to domain item: `prev.removeKeys(entityToken, record)`
- Convert to next storage record: `next.addKeys(entityToken, item)`

Transform semantics:

- Missing handler for an entity token uses the default chain.
- Handler return conventions:
  - `undefined` → drop
  - single item/record → migrate one
  - array → fan-out (same entity token)

Streaming and batching:

- Migration scans source table by pages; transforms within the page; writes batches to target via `EntityClient.putItems`.
- No whole-table accumulation; memory is bounded by page + in-flight work.

Progress:

- Progress callback receives `{ pages, items, outputs, ratePerSec }` at intervals.

Transform authoring helper (`defineTransformMap`):

```ts
import { defineTransformMap } from '@karmaniverous/entity-client-dynamodb/get-dotenv';
import type { ConfigMap as PrevCM } from '../001/entityManager';
import type { ConfigMap as NextCM } from './entityManager';

export default defineTransformMap<PrevCM, NextCM>({
  user: async (record, { prev, next }) => {
    const item = prev.removeKeys('user', record);
    return next.addKeys('user', item);
  },
});
```

## Local DynamoDB orchestration (config-first; embedded fallback)

Command subtree: `dynamodb local start|status|stop` (mounted as `aws dynamodb local ...` when nested).

Endpoint derivation precedence:

1. `plugins["aws/dynamodb"].local.endpoint`
2. `plugins["aws/dynamodb"].local.port` → `http://localhost:{port}`
3. `DYNAMODB_LOCAL_ENDPOINT` (env)
4. fallback: `http://localhost:${DYNAMODB_LOCAL_PORT ?? '8000'}`

Execution behavior:

- If config commands exist (`local.start|stop|status`), run them under a shell in the composed env.
- Start waits until the endpoint is healthy (library readiness if available, else SDK probe).
- Embedded fallback requires `@karmaniverous/dynamodb-local` to be installed; otherwise error with guidance.

## Commander + get-dotenv host typing model (do not guess)

This repo uses `@commander-js/extra-typings` and follows the shipped aws plugin patterns.

Action handler arity:

- If no `.argument(...)` is declared: `.action(async (opts, thisCommand) => {})`
- If `.argument('[args...]')` is declared: `.action(async (args, opts, thisCommand) => {})`

Numeric option parsing (strict):

- Every numeric option uses a parser (`parsePositiveInt`, `parseNonNegativeInt`, `parseFiniteNumber`) so action handlers receive `number` at runtime and invalid values fail during parsing.

Root bag usage (shell/capture):

- Read root options via `readMergedOptions(thisCommand)` and compute capture via `shouldCapture(bag.capture)`.

Config access:

- Use `plugin.readConfig(cli)` (instance helper) rather than indexing `ctx.pluginConfigs[...]` because config is keyed by realized mount path (`aws/dynamodb`).

No optional chaining for ctx:

- Treat `cli.getCtx()` as non-optional at action time.

## Where to look in-source (for assistants making changes)

Use this section when you need to find the actual implementation quickly.

- Root entrypoint exports: `src/index.ts`
- EntityClient core: `src/EntityClient/EntityClient.ts`
- EntityClient helpers: `src/EntityClient/methods/*.ts`
- QueryBuilder class and helpers: `src/QueryBuilder/**`
- Table definition generation: `src/Tables/generateTableDefinition.ts`
- get-dotenv entrypoint exports: `src/get-dotenv/index.ts`
- Layout + version resolution: `src/get-dotenv/layout.ts`
- EM loader (dynamic import): `src/get-dotenv/emLoader.ts`
- YAML utilities: `src/get-dotenv/tableDefinition.ts`, `src/get-dotenv/tableProperties.ts`
- Drift validation: `src/get-dotenv/validate.ts`
- Services: `src/get-dotenv/services/**`
- CLI plugin registration: `src/get-dotenv/cli/plugin/**`
- CLI resolvers: `src/get-dotenv/cli/options/**`
- CLI parsers: `src/get-dotenv/cli/plugin/parsers.ts`

Tests (co-located):

- Most modules have `*.test.ts` nearby; wiring tests under `src/get-dotenv/cli/plugin/commands/*.wiring.test.ts` verify command registration and option presence.

## Common failures and the “first place to check”

- TypeDoc warnings about “referenced but not included”: ensure the referenced type is exported from an entrypoint, or adjust signatures to avoid referring to non-exported types.
- TypeDoc `notDocumented` warnings for anonymous return object properties: prefer named return types (interfaces/types) with documented properties.
- Rollup build failing inside a transitive dependency: check `rollup.config.ts` externals; ensure dependency subpath imports are treated as external.
- Drift validation false positives: check canonicalization in `src/get-dotenv/validate.ts` and ensure YAML nodes are normalized to plain JS before comparison.
- Migration “unable to extract entity token”: check EM config hashKey/shardKeyDelimiter expectations and the input record shape.

## Minimal assistant checklist (do before shipping changes)

- Identify which entrypoint your change impacts (root vs `/get-dotenv`) and avoid leaking exports across entrypoints.
- Keep TypeDoc warnings at 0.
- Keep `exports` and build outputs consistent (JS + d.ts for both entrypoints).
- Ensure CLI adapters remain thin: business rules belong in services, not command registration modules.
