---
title: Config Overlays & Dotenv Expansion
---

# Config Overlays & Dotenv Expansion

Configure the plugin in `getdotenv.config.json`. String values support `$VAR` and `${VAR:default}` expansion from the composed dotenv context.

Example

```json
{
  "plugins": {
    "dynamodb": {
      "tablesPath": "./tables",
      "tokens": {
        "table": "table",
        "entityManager": "entityManager",
        "transform": "transform"
      },
      "generate": { "version": "001" },
      "create": { "version": "001", "waiter": { "maxSeconds": 60 } },
      "delete": { "tableName": "$DDB_TABLE" },
      "purge": { "tableName": "$DDB_TABLE" },
      "migrate": {
        "sourceTable": "$SRC",
        "targetTable": "$TGT",
        "fromVersion": "001",
        "toVersion": "002",
        "pageSize": 100,
        "transformConcurrency": 2
      }
    }
  }
}
```

Precedence

1. CLI flags (dotenv-expanded)
2. `plugins.dynamodb` config (dotenv-expanded)
3. Documented defaults

Related

- [Install and host integration](./install-and-host.md)
- [CLI usage recipes](./recipes.md)
