---
title: Versioned Layout & Tokens
---

# Versioned Layout & Tokens

Opinionated structure under a configurable root (default: `tables`):

```
tables/
  table.template.yml     # optional baseline for non-generated Properties
  001/
    entityManager.ts     # EM for this version (or fallback to earlier)
    table.yml            # full AWS::DynamoDB::Table resource
    transform.ts         # optional per-step transforms
  002/
    ...
```

Tokens (configurable)

- `table` (table.yml)
- `entityManager` (entityManager.ts/.js)
- `transform` (transform.ts/.js)

Fallback EntityManager resolution

- For each step, resolve both prev and next EM: try the version directory first; if missing, walk backward to the nearest version with entityManager present.
- Required for the default chain (prev.removeKeys → next.addKeys).

Notes

- Version directories are zero-padded (e.g., `001`, `002`).
- File resolution supports .ts and .js for EM/transform modules.

Related

- [Table lifecycle](./table-lifecycle.md)
- [Authoring transforms](./authoring-transforms.md)
