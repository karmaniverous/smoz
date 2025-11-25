---
title: Authoring Transforms
---

# Authoring Transforms

Write per-step transforms in `tables/NNN/transform.ts` using `defineTransformMap<PrevCM, NextCM>`. Omitted entities use the default chain: `prev.removeKeys → next.addKeys`.

Example

```ts
import { defineTransformMap } from '@karmaniverous/entity-client-dynamodb/get-dotenv';
import type { ConfigMap as PrevCM } from '../001/entityManager';
import type { ConfigMap as NextCM } from './entityManager';

export default defineTransformMap<PrevCM, NextCM>({
  user: async (record, { prev, next }) => {
    const item = prev.removeKeys('user', record); // storage -> domain
    // Optional domain changes here...
    return next.addKeys('user', item); // domain -> storage
  },
});
```

Semantics

- `undefined` → drop the record
- single item/record → migrate one
- array of items/records → fan-out (same entity token)
- Cross-entity fan-out is not supported in v1.

Performance knobs

- `--transform-concurrency` controls transform parallelism within a page (default 1).
- Unprocessed items on writes are retried by EntityClient batch utilities.

Related

- [Data migration](./migrate.md)
- [Versioned layout and tokens](./versioned-layout.md)
