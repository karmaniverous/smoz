---
title: Table Lifecycle
---

# Table Lifecycle

Commands (namespaced under `dynamodb`)

- `generate` – compose or refresh `tables/NNN/table.yml` (comment-preserving)
- `validate` – compare generated sections against the resolved EM
- `create` – create table from YAML (validate or refresh generated sections)
- `delete` – delete table (waiter)
- `purge` – scan and delete all items

Generate (from root baseline if present)

```bash
mycli dynamodb generate --version 001
```

Validate drift

```bash
mycli dynamodb validate --version 001
```

Create (validate by default)

```bash
mycli dynamodb create --version 001 --max-seconds 60
```

Create with refresh and TableName override

```bash
mycli dynamodb create --version 001 \
  --refresh-generated \
  --table-name-override MyTable \
  --max-seconds 120
```

Delete and purge (confirmation required; CI use `--force`)

```bash
mycli dynamodb delete --table-name MyTable --version 001 --max-seconds 30 --force
mycli dynamodb purge  --table-name MyTable --version 001 --force
```

Comment-preserving YAML

- Only the generated Properties keys are overwritten:
  - AttributeDefinitions
  - KeySchema
  - GlobalSecondaryIndexes
- All other Properties and comments are preserved.

Related

- [Versioned layout and tokens](./versioned-layout.md)
- [Data migration](./migrate.md)
