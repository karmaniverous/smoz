---
title: Local DynamoDB
---

# Local DynamoDB

Configure and control a local DynamoDB instance under the plugin namespace. Commands:

- dynamodb local start [--port <n>]
- dynamodb local stop
- dynamodb local status

Behavior (config-first with embedded fallback)

- Config-driven (preferred when configured):
  - Strings are interpolated by the host once before execution.
  - start: run `plugins.dynamodb.local.start`, then wait for readiness before returning success.
  - status: run `plugins.dynamodb.local.status` and return its exit code (0 = healthy).
  - stop: run `plugins.dynamodb.local.stop` and return non-zero on failure.
- Embedded fallback (only when no config command is set):
  - If `@karmaniverous/dynamodb-local` is installed:
    - start: setupDynamoDbLocal(port) then dynamoDbLocalReady(client)
    - stop: teardownDynamoDbLocal()
    - status: health probe via the AWS SDK (ListTables)
  - Otherwise: a concise guidance message is printed and the command returns non-zero.

No separate "ready" command

- start waits until the endpoint is healthy (library first, else AWS SDK health probe).

Endpoint derivation

1) `plugins.dynamodb.local.endpoint`
2) `plugins.dynamodb.local.port` → `http://localhost:{port}`
3) `DYNAMODB_LOCAL_ENDPOINT` (env)
4) Fallback: `http://localhost:${DYNAMODB_LOCAL_PORT ?? '8000'}`

On successful start the CLI prints:

```
local dynamodb: endpoint http://localhost:8000
Hint: export DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000 so app code targets Local.
```

Config slice

```json
{
  "plugins": {
    "dynamodb": {
      "local": {
        "port": 8000,
        "endpoint": "http://localhost:8000",
        "start": "docker compose up -d dynamodb",
        "stop": "docker compose stop dynamodb",
        "status": "docker ps --format '{{.Names}}' | grep -q dynamodb"
      }
    }
  }
}
```

Shell/env/capture

- Commands run under get-dotenv’s composed environment.
- Shell selection and capture behavior follow the host options; see “Executing Shell Commands” and “Shell execution behavior” guides.
