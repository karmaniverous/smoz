# Interop — DynamoDB CLI plugin: local orchestration and config

When: 2025-11-25

Scope
- Add local DynamoDB orchestration commands to the DynamoDB get‑dotenv plugin that SMOZ wires, without forcing a single opinionated approach on downstream projects.
- Standardize environment variables and dynamic naming used by SMOZ templates and fixtures.

## New subcommands (smoz dynamodb local …)

Add the following subcommands under the plugin’s namespace (exposed via SMOZ CLI):
- `smoz dynamodb local start [--port <n>]`
- `smoz dynamodb local stop`
- `smoz dynamodb local status`  (exit 0 when running)
- `smoz dynamodb local ready`   (exit 0 when ready/healthy)

Behavioral resolution (priority order):
1) Config‑driven commands
   - If `getdotenv` config provides shell commands, execute those:
     - `plugins.dynamodb.local.start: string`
     - `plugins.dynamodb.local.stop: string`
     - `plugins.dynamodb.local.status: string` (exit 0 if running)
     - `plugins.dynamodb.local.ready: string` (optional; exit 0 if healthy)
   - Use the host’s normal spawn environment. No custom token interpolation is required here — `getdotenv` provides native `$VAR` interpolation for plugin configs. Teams can reference `$DYNAMODB_LOCAL_PORT` and `$DYNAMODB_LOCAL_ENDPOINT` directly in command strings.

2) Embedded orchestration (optional peer)
   - If `@karmaniverous/dynamodb-local` is installed, implement:
     - start: `setupDynamoDbLocal(port)`
     - stop: `teardownDynamoDbLocal()`
     - status/ready: `dynamoDbLocalReady(client)` or an SDK ListTables probe against the computed endpoint.
   - This path kicks in only when config does not specify commands.

3) Graceful fallback (no config, no library)
   - Print a concise message explaining options:
     - Provide `plugins.dynamodb.local.{start|stop|status}` commands in config, or
     - Install `@karmaniverous/dynamodb-local` for built‑in orchestration.
   - `status/ready` should return a non‑zero exit code only when invoked explicitly (so CI can enforce readiness); otherwise just print guidance.

Notes
- Keep output quiet unless invoked; no background polling.
- Use `getdotenv`’s spawn‑env normalization; no bespoke env merging logic in the plugin.

## Endpoint derivation for local flows

The plugin should compute an effective endpoint to communicate to users/tools:
- Priority for endpoint:
  1) `plugins.dynamodb.local.endpoint` (string) when present
  2) `plugins.dynamodb.local.port` → `http://localhost:{port}`
  3) `process.env.DYNAMODB_LOCAL_ENDPOINT` (already present in the environment)
- On “start”, print the effective endpoint and a hint:
  ```
  local dynamodb: endpoint http://localhost:8000
  Hint: export DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000 so app code targets Local.
  ```

## Environment variables (standardize)

- `DYNAMODB_LOCAL_ENDPOINT` — canonical env var used by app code to direct `EntityClient` to Local (e.g., `http://localhost:8000`). Handlers read this to set the client endpoint when present; otherwise they use AWS defaults for cloud.
- `DYNAMODB_LOCAL_PORT` — optional helper var that teams can use in config commands (start/stop/status) or to derive the endpoint.

No custom token interpolation is needed in the plugin — `getdotenv` config already supports `$DYNAMODB_LOCAL_ENDPOINT` and `$DYNAMODB_LOCAL_PORT` in command strings and other values.

## Config shape (getdotenv)

Allow the following slice under `plugins.dynamodb.local`:
```json
{
  "plugins": {
    "dynamodb": {
      "local": {
        "port": 8000,
        "endpoint": "http://localhost:8000",
        "start": "docker compose up -d dynamodb",
        "stop": "docker compose stop dynamodb",
        "status": "docker ps --format '{{.Names}}' | grep -q dynamodb",
        "ready": "aws dynamodb list-tables --endpoint-url $DYNAMODB_LOCAL_ENDPOINT >/dev/null 2>&1"
      }
    }
  }
}
```
Notes
- All strings honor `getdotenv`’s native env interpolation (e.g., `$DYNAMODB_LOCAL_ENDPOINT`).
- The embedded path is only used if the `local` commands are not configured.

## Exit codes

- `status`:
  - `0` when Local is running;
  - non‑zero otherwise (only enforced when explicitly invoked).
- `ready`:
  - `0` on healthy (ListTables success / library “ready” check);
  - non‑zero otherwise.
- `start/stop` should exit non‑zero only on operational failure (command/library failure).

## Table naming and versioning (dynamic naming)

SMOZ templates and fixture use these dynamic names:
- `STAGE_NAME = ${SERVICE_NAME}-${STAGE}` (tracked param; duplicated per stage intentionally)
- Code‑selected canonical table name:
  - `TABLE_NAME = ${STAGE_NAME}-${TABLE_VERSION}`
  - `TABLE_NAME_DEPLOYED = ${STAGE_NAME}-${TABLE_VERSION_DEPLOYED}`
  - `TABLE_VERSION` is public (tracked, global)
  - `TABLE_VERSION_DEPLOYED` is private per environment (e.g., loaded from Secrets Manager into a `.local` file before deploy by a separate process)
- Generated, versioned table YAMLs import under distinct logical IDs in Serverless (co‑existence by version):
  - e.g., `tables/000/table.yml` should set:
    ```
    TableName: ${param:STAGE_NAME}-000
    ```
  - Teams import multiple versioned tables side‑by‑side (e.g., `Table000`, `Table001`, …) and remove older ones when migrations are proven.

## Default behaviors (DX)

- If `local` commands are configured in `getdotenv`:
  - Use them verbatim; print resulting endpoint/port where helpful.
- Else if `@karmaniverous/dynamodb-local` is installed:
  - Provide start/stop/status/ready via embedded library (no other deps).
- Else:
  - Print short guidance on how to configure either path and exit gracefully.

This keeps the plugin useful without forcing a single local runtime across teams.

## Rationale and alignment

- Config‑driven commands let teams bring their own local orchestration (docker/compose, platform scripts) without forking the plugin.
- Embedded local is still first‑class when projects install `@karmaniverous/dynamodb-local`.
- Environment interpolation is natively handled by `getdotenv`; the plugin should not add a separate token system — `$DYNAMODB_LOCAL_ENDPOINT` and `$DYNAMODB_LOCAL_PORT` are sufficient.
- Dynamic naming with `STAGE_NAME` matches SMOZ templates and enables:
  - One canonical runtime table per service (current code version),
  - Multiple versioned tables during migrations (side‑by‑side), and
  - Clear, stable resource naming across environments.

## Acceptance criteria

1) New subcommands exist and behave per resolution order with correct exit codes.
2) Config commands can reference `$DYNAMODB_LOCAL_ENDPOINT` / `$DYNAMODB_LOCAL_PORT` (native `getdotenv` interpolation).
3) Embedded path works when `@karmaniverous/dynamodb-local` is present (no config commands).
4) Friendly guidance when neither config commands nor the library are available.
5) Versioned table YAML can reference `${param:STAGE_NAME}-NNN` for TableName.
```
