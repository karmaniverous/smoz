---
title: Data Migration
---

# Data Migration

Stream data across version steps with optional per-step transforms.

Basic usage

```bash
mycli dynamodb migrate \
  --source-table Source \
  --target-table Target \
  --from-version 001 \
  --to-version 002 \
  --page-size 100 \
  --limit 10000 \
  --transform-concurrency 4 \
  --progress-interval-ms 2000 \
  --force
```

How it works

- Step discovery: enumerate all versions where `from < k <= to` (ascending).
- For each step:
  - Resolve prev and next EntityManagers with fallback.
  - Load an optional `transform.ts`; otherwise use the default chain.
- Scan Source by pages and apply the chain; write to Target with retries.
- Emit progress (pages, items, outputs, items/sec) at an interval.

Default chain

```text
prev.removeKeys(entityToken, record) -> next.addKeys(entityToken, item)
```

Notes

- Limit is enforced across outputs; fan-out counts toward the limit.
- `sourceTable` and `targetTable` can be provided via flags, config, or env (dotenv expansion supported).

Related

- [Authoring transforms](./authoring-transforms.md)
- [Versioned layout and tokens](./versioned-layout.md)
