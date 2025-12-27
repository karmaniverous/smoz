# STAN Assistant Guide — `@karmaniverous/entity-manager`

This guide is written for STAN assistants working in codebases that use **Entity Manager**. It is intended to be self-contained: it explains the library’s runtime model, configuration rules, and the type-level contracts you must satisfy when integrating a provider (e.g., DynamoDB) or writing app code.

Entity Manager is provider-agnostic: it does **not** talk to your database. Instead it:

- Generates and maintains key fields and other generated properties from config (`addKeys`, `getPrimaryKey`, `removeKeys`).
- Encodes/decodes generated properties via transcodes.
- Orchestrates parallel, cross-shard queries through injected shard query functions (`query`).
- Dehydrates/rehydrates cross-shard page keys into a single compact token (`pageKeyMap`).

---

## Acronyms used in generics (local glossary)

This repo uses a strict generic-parameter dictionary. In this guide, acronyms appear primarily in generic type parameters.

- Captured config map (**CC**): the config-derived type map used across the library.
- Values-first config literal (**CF**): the literal config type captured at construction time (type-only “phantom” generic).
- Entity token (**ET**): a union of entity names (keys of the configured entity map).
- Index token (**IT**): a union of index names (keys of `config.indexes`).
- Index token subset (**ITS**): a subset union of index tokens used in a given query/map.
- Projection tuple (**K**): a type-only channel representing projected attribute keys (e.g., `const attrs = ['userId'] as const`).

---

## Mental model (runtime)

### The global keys

Entity Manager assumes a table with a **global** hash key and range key property name shared across all entity types:

- `config.hashKey`: e.g. `"pk"` or `"hashKey2"`.
- `config.rangeKey`: e.g. `"sk"` or `"rangeKey"`.

For each entity token:

- **Hash key value** is `"<entityToken><shardKeyDelimiter><shardSuffix>"`, e.g. `user!0a`.
  - If the active shard bump has `chars === 0`, the suffix is empty: `user!`.
- **Range key value** is `"<uniqueProperty><generatedValueDelimiter><uniqueValue>"`, e.g. `userId#abc123`.

### Sharding (“shard bumps”)

Each entity can define a time-based scale-up schedule via `shardBumps`:

```ts
{ timestamp: number; charBits: 1..5; chars: 0..40 }
```

- The applicable bump is chosen by `timestampProperty` on the item (e.g., `created`).
- `charBits` controls radix: `radix = 2 ** charBits`.
- `chars` controls width; full shard space is `radix ** chars`.
- The shard suffix is computed deterministically from `uniqueProperty` (string-hash) modulo the full shard space.

### Generated properties (index helpers)

Generated properties are additional string-valued tokens used as index key components:

- **Sharded generated property**:
  - Encoded format: `"<hashKeyValue>|k#v|k#v..."`
  - **Atomic**: if any required element is `null`/`undefined`, encoding returns `undefined`.
  - Used only on the hash-key side of an index (must be global hashKey or a sharded generated property).
- **Unsharded generated property**:
  - Encoded format: `"k#v|k#v..."` (missing values become empty strings)
  - Used on the range-key side of an index.

### Indexes

`config.indexes` describes secondary index key _tokens_ (not provider-specific index definitions):

```ts
indexes: {
  [indexToken]: {
    hashKey: config.hashKey | shardedGeneratedKey;
    rangeKey: config.rangeKey | unshardedGeneratedKey | transcodedProperty;
    projections?: string[]; // optional, validated (must not include key tokens)
  }
}
```

Entity Manager uses index definitions for:

- Determining page key _shape_ per index (type narrowing with CF).
- Rehydrating and dehydrating page keys.
- Validating index tokens and finding an index token by (hashKeyToken, rangeKeyToken).

---

## Values-first configuration and `createEntityManager`

### Preferred construction (inference-first)

Use `createEntityManager(config)` with a values-first config literal (`as const`) to capture tokens and index names:

```ts
import { z } from 'zod';
import {
  createEntityManager,
  defaultTranscodes,
} from '@karmaniverous/entity-manager';

const userSchema = z.object({
  userId: z.string(),
  created: z.number(),
  firstNameCanonical: z.string(),
  lastNameCanonical: z.string(),
});

const config = {
  hashKey: 'hashKey2',
  rangeKey: 'rangeKey',
  generatedProperties: {
    sharded: { userPK: ['userId'] as const },
    unsharded: {
      firstNameRK: ['firstNameCanonical', 'lastNameCanonical'] as const,
    },
  },
  propertyTranscodes: {
    userId: 'string',
    created: 'timestamp',
    firstNameCanonical: 'string',
    lastNameCanonical: 'string',
  },
  indexes: {
    created: { hashKey: 'hashKey2', rangeKey: 'created' },
    firstName: { hashKey: 'hashKey2', rangeKey: 'firstNameRK' },
    userCreated: { hashKey: 'userPK', rangeKey: 'created' },
  } as const,
  entities: {
    user: { uniqueProperty: 'userId', timestampProperty: 'created' },
  },
  // compile-time shape capture only; stripped from runtime config
  entitiesSchema: { user: userSchema },
  transcodes: defaultTranscodes,
} as const;

const em = createEntityManager(config);
```

Notes:

- `entitiesSchema` is compile-time only; the runtime config is still validated by Zod, and `entitiesSchema` is stripped before parsing.
- Use `as const` (especially on `indexes` and generated property element arrays) to preserve literal unions.

### Runtime config validation (what can break at construction time)

The constructor parses config with Zod and rejects many mismatches, including:

- delimiter collisions (`generatedKeyDelimiter`, `generatedValueDelimiter`, `shardKeyDelimiter`)
- key token collisions (hashKey/rangeKey vs generated keys vs transcoded properties)
- generatedProperties elements not present in `propertyTranscodes`
- indexes with invalid hashKey/rangeKey tokens, duplicate hash/range pairs, or invalid projections
- shard bump monotonicity errors

If config parsing fails, treat it as a **schema error** and fix the config, not the code.

---

## Type model you must understand

### By-token domain vs DB shapes

Entity Manager’s public item/record types are by-token (narrowed by entity token).

- `EntityItem<CC, ET>`
  - Domain-facing “full” shape for that entity token, plus optional key/token strings.
- `EntityItemPartial<CC, ET, K = unknown>`
  - Domain-facing projected/seed shape.
  - If `K` omitted: permissive partial.
  - If `K` provided: a `Pick<...>` restricted to `K`.
- `EntityRecord<CC, ET>`
  - DB-facing record: required global hash/range keys + partial domain fields.
- `EntityRecordPartial<CC, ET, K = unknown>`
  - Projected DB record (Pick by `K`).

Token-agnostic storage helpers (exported for reference and advanced use):

- `StorageItem<CC>` / `StorageRecord<CC>` (property-level, flattened across entities)

### Key type

- `EntityKey<CC>`: `Record<CC['HashKey'] | CC['RangeKey'], string>`

### Index-aware page keys (optional CF channel)

- `PageKeyByIndex<CC, ET, IT, CF>` narrows the page key object to only the key components for that index **when CF carries `indexes`**.
- Without CF, it falls back to the broader `PageKey<CC>` shape.

---

## Key lifecycle: `addKeys`, `removeKeys`, `getPrimaryKey`

### `addKeys(entityToken, item, overwrite?)`

- Input: domain-ish partial item (`EntityItemPartial`).
- Output: DB-ish record (`EntityRecordPartial`) with:
  - global hash/range keys set (unless already present and `overwrite=false`)
  - generated properties updated based on overwrite rules

Use it before writes.

```ts
const record = em.addKeys('user', {
  userId: 'u1',
  created: Date.now(),
  firstNameCanonical: 'lee',
  lastNameCanonical: 'zhang',
});
// record.hashKey2 and record.rangeKey are present (strings)
```

### `removeKeys(entityToken, recordOrRecords)`

- Strips global keys and generated property tokens from a DB record.
- Overloads preserve projected-vs-strict behavior:
  - Strict `EntityRecord` input yields strict `EntityItem` output.
  - Projected `EntityRecordPartial<..., K>` yields `EntityItemPartial<..., K>`.

Use it after reads if your app layer should not see storage keys.

### `getPrimaryKey(entityToken, itemOrItems, overwrite?)`

- Always returns an array of keys (`EntityKey<CC>[]`).
- Behavior:
  - If both keys exist and `overwrite=false`, returns exactly that pair.
  - Otherwise computes `rangeKey` from `uniqueProperty`.
  - If `timestampProperty` is present, computes exactly one hash key.
  - If `timestampProperty` is missing, enumerates hash key space across bumps (deterministic per bump if `uniqueProperty` is present).

Use it to generate keys for point reads / batch reads.

---

## Query orchestration: what `EntityManager.query()` does

Entity Manager’s query API is _orchestration only_. You provide shard query functions (provider integration); it runs them across shards and indexes and merges results.

### Your responsibility: implement `ShardQueryFunction`

`ShardQueryFunction<CC, ET, IT, CF, K>` is:

```ts
(hashKey: string, pageKey?: PageKeyByIndex<...>, pageSize?: number)
  => Promise<{ count: number; items: EntityItemPartial<CC, ET, K>[]; pageKey?: PageKeyByIndex<...> }>
```

Rules for a correct implementation:

- Query **exactly one shard** (partition) per call using the provided `hashKey` value.
- Query **exactly one index** per function (the map key tells you which index you’re implementing).
- Respect `pageKey` and `pageSize` as “resume token” and per-shard page size.
- Return `pageKey: undefined` when that shard/index is exhausted.

### Orchestration behavior (library responsibility)

When you call `em.query(options)`:

- It rehydrates the (possibly compressed) `pageKeyMap` into a 2-layer structure:
  - `indexToken -> hashKeyValue -> pageKey | undefined`
- It enumerates shard hash key space for the given `entityToken`, `hashKeyToken`, and `[timestampFrom, timestampTo]`.
- It runs all shard queries in parallel (bounded by `throttle`).
- It repeats shard querying until:
  - all shards return `pageKey === undefined` (no pages remain), or
  - the accumulated item count reaches `limit` (note: fan-out can exceed `limit`).
- It dedupes by `uniqueProperty` and sorts by `sortOrder`.
- It dehydrates + compresses the updated page-key map into a single string token (`result.pageKeyMap`) you pass into the next call.

### `QueryOptions` fields you must understand

Key options:

- `entityToken`: selects entity config (uniqueProperty, timestampProperty, shard bumps, defaults).
- `item`: a partial item used to generate alternate hash key spaces (if needed); may be `{}` for global hash key indexes.
- `shardQueryMap`: map of `indexToken -> ShardQueryFunction` (single- or multi-index).
- `pageKeyMap?: string`: the returned token from a prior query call.
- `limit?: number | Infinity`: target maximum total items across shards (positive int or Infinity).
- `pageSize?: number`: max per-shard page size (positive int).
- `timestampFrom?: number`, `timestampTo?: number`: bounds which shard bumps/shards are queried.
- `sortOrder?: SortOrder<...>`: used after merge/dedupe.
- `throttle?: number`: max shard queries in flight.

### Minimal multi-index example (provider-agnostic)

```ts
import type {
  QueryOptionsByCF,
  ShardQueryFunction,
  ShardQueryMapByCF,
} from '@karmaniverous/entity-manager';

const cf = {
  indexes: {
    firstName: { hashKey: 'hashKey2', rangeKey: 'firstNameRK' },
    lastName: { hashKey: 'hashKey2', rangeKey: 'lastNameRK' },
  },
} as const;
type CF = typeof cf;

type CC = /* your ConfigMap<...> */;

const firstNameSQF: ShardQueryFunction<CC, 'user', 'firstName', CF> =
  async (hashKey, pageKey, pageSize) => {
    // provider-specific query here
    return { count: 0, items: [], pageKey };
  };

const lastNameSQF: ShardQueryFunction<CC, 'user', 'lastName', CF> =
  async (hashKey, pageKey, pageSize) => {
    return { count: 0, items: [], pageKey };
  };

const shardQueryMap: ShardQueryMapByCF<CC, 'user', CF> = {
  firstName: firstNameSQF,
  lastName: lastNameSQF,
};

const options: QueryOptionsByCF<CC, 'user', CF> = {
  entityToken: 'user',
  item: {},
  shardQueryMap,
  pageSize: 25,
  limit: 200,
};

const result = await em.query(options);
// result.pageKeyMap is a compact token: pass it back into the next call
```

---

## Projection (type-only K) and adapter responsibilities

`K` is a type-only way to express “I projected a subset of attributes at runtime”.

If you pass a projection tuple type through your shard query functions/options/results, then:

- Items become `Pick<EntityItem<...>, KeysFrom<K>>[]`.
- Sort typing aligns to the projected shape.

Example:

```ts
const attrs = ['userId', 'created'] as const;
type K = typeof attrs;

const sqf: ShardQueryFunction<CC, 'user', 'firstName', CF, K> = async () => ({
  count: 0,
  items: [],
});
```

Critical invariant:

- Entity Manager dedupes by `uniqueProperty` and sorts by `sortOrder`.
- If your adapter uses projections at runtime, it should auto-include:
  - the entity’s `uniqueProperty`, and
  - any attributes used by the sort order,
    even if the caller omitted them from the projection tuple.

Otherwise, runtime dedupe/sort may be incorrect.

---

## Index token inference and narrowing patterns

Entity Manager supports two complementary inference routes:

### CF route (values-first config literal)

If you have a literal like:

```ts
const cf = { indexes: { firstName: {...}, lastName: {...} } } as const;
```

Then:

- `IndexTokensOf<typeof cf>` becomes `'firstName' | 'lastName'`
- `ShardQueryMapByCF<..., typeof cf>` only allows those keys
- `PageKeyByIndex<..., 'firstName', typeof cf>` narrows the page key shape to that index’s components

### CC route (captured config type)

If you want ITS derived from a captured config literal type (commonly your config value type):

- `ShardQueryMapByCC<CCMap, ET, CCLiteral>`
- `QueryOptionsByCC<CCMap, ET, CCLiteral>`

These derive ITS from `IndexTokensFrom<CCLiteral>` and pass `CCLiteral` through the CF channel for page-key narrowing.

### `findIndexToken` convenience

`EntityManager.findIndexToken(hashKeyToken, rangeKeyToken, suppressError?)` returns an index token, and when the manager was constructed with a values-first config literal, its return type narrows to `IndexTokensOf<CF>`.

---

## Adapter building blocks shipped in this package

This package includes abstract helpers meant for provider adapters.

### `BaseEntityClient`

- Owns an `entityManager` and a `logger` (`debug`/`error`).
- Holds optional `batchProcessOptions` (used by downstream adapters).

### `BaseQueryBuilder`

`BaseQueryBuilder` helps adapters construct a `ShardQueryMap` fluently while keeping the provider-specific logic inside `getShardQueryFunction(indexToken)`.

Key points:

- You define an `IndexParams` type (your per-index mutable query state).
- The builder maintains `indexParamsMap: Record<ITS, IndexParams>`.
- `build()` returns a `ShardQueryMap` by mapping index tokens to shard query functions.
- `query()` forwards to `entityManager.query(...)` with the builder’s `pageKeyMap` and built shardQueryMap.

The shared query options type for builder `query()` is:

- `QueryBuilderQueryOptions<CC, ET, CF>` = `QueryOptions` minus `entityToken`, `pageKeyMap`, `shardQueryMap`.

---

## Common failure modes (debug checklist)

When queries behave unexpectedly, check:

- Config validity:
  - `propertyTranscodes` includes every property referenced by generated properties.
  - Index hashKey token is global hashKey or a _sharded_ generated key.
  - Index rangeKey token is global rangeKey or an _unsharded_ generated key or a transcoded scalar.
- Shard query function correctness:
  - You used the passed `hashKey` value as the partition key value.
  - You mapped `pageKey` into provider pagination correctly.
  - You return `pageKey: undefined` when exhausted.
- Paging token handling:
  - You treat `result.pageKeyMap` as an opaque token and pass it unchanged.
  - You keep the same set of index tokens between query calls (same shardQueryMap keys); otherwise pageKeyMap validation will fail.
- Projection invariants:
  - If using projections, your adapter auto-included uniqueProperty and sort keys at runtime.
- “limit” expectations:
  - `limit` is a target cap across all shards. Fan-out may overshoot because it queries shards in batches of `pageSize`.

---

## What STAN assistants should do when editing code that uses Entity Manager

- Prefer values-first configs (`as const`) and avoid broad annotations that widen literal unions.
- Keep providers thin:
  - put orchestration in Entity Manager,
  - put provider query details in the shard query functions or adapter helpers.
- When you add a projection feature in an adapter, implement the auto-include policy for uniqueProperty and explicit sort keys.
- When you add a new index token, update:
  - config indexes,
  - any adapter query builder maps/condition helpers that assume specific index names,
  - tests that validate page key narrowing or index token unions.

That’s the full contract: if your shard query functions behave like “query one shard page”, Entity Manager can do the rest.
