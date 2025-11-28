---
title: Querying with QueryBuilder
---

# Querying with QueryBuilder

Compose cross-shard, multi-index queries with strong typing and optional projections.

Factory and conditions

```ts
import { createQueryBuilder } from '@karmaniverous/entity-client-dynamodb';

// Infer ET from entityToken; ITS defaults to string
const qb = createQueryBuilder({
  entityClient: client,
  entityToken: 'user',
  hashKeyToken: 'hashKey2',
});

// Automatic index inference:
// If your EntityClient was built from createEntityManager(config as const),
// index tokens (ITS) and per-index page keys are inferred automatically (no cf needed).

// Add a range key condition
qb.addRangeKeyCondition('created', {
  property: 'created',
  operator: 'between',
  value: { from: 1700000000000, to: 1900000000000 },
});
```

Run the query

```ts
const shardQueryMap = qb.build();
const { items, pageKeyMap } = await client.entityManager.query({
  entityToken: 'user',
  item: {}, // minimal fields to derive alternate keys when needed
  shardQueryMap, // built from the adapter
  pageSize: 25,
});
```

Paging

To fetch the next page, pass the returned `pageKeyMap` back into `EntityManager.query`.

Projections (K channel)

```ts
// Per-index projection; narrows K at the type level
const withProj = qb.setProjection('created', ['created'] as const);

// Uniform projection across indices
const withAll = qb.setProjectionAll(['created'] as const, ['created'] as const);

// Clear projections (widen back to full shape)
const resetOne = withAll.resetProjection('created');
const resetAll = withAll.resetAllProjections();
```

Scan direction

```ts
qb.setScanIndexForward('created', false); // reverse chronological
```

Notes

- When any projection is present, the adapter auto-includes the entity uniqueProperty and any explicit sort keys at runtime to preserve dedupe/sort invariants.
- When your EntityClient is constructed from `createEntityManager(config as const)`, index tokens (ITS) and per-index page keys are inferred automatically.

Related

- [EntityClient: CRUD and batches](./entityclient-and-crud.md)
- [Type inference mental model](./type-inference-model.md)
