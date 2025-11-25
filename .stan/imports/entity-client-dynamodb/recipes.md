---
title: CLI Usage Recipes
---

# CLI Usage Recipes

Compose YAML for a new version

```bash
mycli dynamodb generate --version 001
```

Validate generated sections vs EM

```bash
mycli dynamodb validate --version 001
```

Create with refresh and TableName override

```bash
mycli dynamodb create --version 001 \
  --refresh-generated \
  --table-name-override MyTable \
  --max-seconds 120
```

Delete and purge (CI-friendly)

```bash
mycli dynamodb delete --table-name MyTable --version 001 --max-seconds 30 --force
mycli dynamodb purge  --table-name MyTable --version 001 --force
```

Migrate data with progress

```bash
mycli dynamodb migrate \
  --source-table Source \
  --target-table Target \
  --from-version 001 \
  --to-version 002 \
  --page-size 100 \
  --transform-concurrency 4 \
  --progress-interval-ms 2000 \
  --force
```
