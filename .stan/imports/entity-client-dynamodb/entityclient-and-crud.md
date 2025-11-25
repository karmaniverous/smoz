---
title: 'EntityClient: CRUD and Batches'
---

# EntityClient: CRUD and Batches

Token-aware reads and convenient batches with strong types.

Token-aware getItem/getItems

```ts
// Record shape narrowed by the literal entity token
const rec = await client.getItem('user', { hashKey2: 'h', rangeKey: 'r' });
const item = rec.Item && client.entityManager.removeKeys('user', rec.Item);

// Project selected attributes (tuple preserves types)
const recProj = await client.getItem('user', { hashKey2: 'h', rangeKey: 'r' }, [
  'a',
] as const);

// Batch get
const many = await client.getItems('user', [
  { hashKey2: 'h', rangeKey: 'r1' },
  { hashKey2: 'h', rangeKey: 'r2' },
]);
const domain = client.entityManager.removeKeys('user', many.items);
```

Basic CRUD (records)

```ts
// Put a storage record (keys included)
await client.putItem({ hashKey2: 'h', rangeKey: 'r', a: 1 });

// Delete a record
await client.deleteItem({ hashKey2: 'h', rangeKey: 'r' });
```

Batched writes

```ts
// putItems
await client.putItems([
  { hashKey2: 'h', rangeKey: '1' },
  { hashKey2: 'h', rangeKey: '2' },
]);

// deleteItems
await client.deleteItems([
  { hashKey2: 'h', rangeKey: '1' },
  { hashKey2: 'h', rangeKey: '2' },
]);
```

Purge (scan + batched deletes)

```ts
const purged = await client.purgeItems();
```

Transactions

```ts
await client.transactPutItems([
  { hashKey2: 'h', rangeKey: '10', x: 1 },
  { hashKey2: 'h', rangeKey: '11', x: 2 },
]);

await client.transactDeleteItems([
  { hashKey2: 'h', rangeKey: '10' },
  { hashKey2: 'h', rangeKey: '11' },
]);
```

Notes

- Token in → narrowed type out. Pass a literal entity token to narrow record types automatically.
- Domain vs storage: when you want domain shapes, strip keys via `entityManager.removeKeys(entityToken, records)`.
- Projection tuples (const) narrow shapes at the call site for token-aware reads.

Related

- [Querying with QueryBuilder](./querying-with-querybuilder.md)
- [Type inference mental model](./type-inference-model.md)
