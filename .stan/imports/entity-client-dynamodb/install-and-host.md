---
title: Install & Host Integration
---

# Install & Host Integration

Install the get-dotenv host (optional peer) and wire the DynamoDB plugin.

```bash
npm i -D @karmaniverous/get-dotenv
```

Create a host CLI

```ts
// mycli.ts
import { createCli } from '@karmaniverous/get-dotenv';
import { dynamodbPlugin } from '@karmaniverous/entity-client-dynamodb/get-dotenv';

await createCli({ alias: 'mycli' })
  .use(dynamodbPlugin) // namespaced as "dynamodb"
  .run(process.argv.slice(2));
```

Minimal config (getdotenv.config.json)

```json
{
  "plugins": {
    "dynamodb": {
      "tablesPath": "./tables",
      "tokens": {
        "table": "table",
        "entityManager": "entityManager",
        "transform": "transform"
      }
    }
  }
}
```

Next

- See [Versioned layout and tokens](./versioned-layout.md) for the files under tables/NNN.
- See [Table lifecycle](./table-lifecycle.md) for generate/validate/create/delete/purge flows.
- See [Data migration](./migrate.md) for step discovery, transforms, and progress.
