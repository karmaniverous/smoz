---
title: CLI
---

# CLI

## From zero in two commands

```bash
npx @karmaniverous/smoz init -i
npx smoz dev -p 3000
```

- The first command scaffolds a new app and installs dependencies (including a local `smoz` bin).
- The second command starts the inline local backend; open http://localhost:3000/openapi
- Prefer serverless‑offline? Use `-l offline`: `npx smoz dev -l offline -p 3000`

This mirrors the README quickstart for the fastest path to “it runs.”

## Signature

```bash
npx smoz
```

Prints version, repo root, detected PM, and presence of key files.

Tip: you can print the CLI version directly:

```bash
npx smoz -v
```

## init

```bash
npx smoz init --yes
```

First‑time npx note: You can also run `npx @karmaniverous/smoz init -i` in an empty directory — this uses the published package and installs template dependencies so subsequent `npx smoz …` commands run from your local bin.

Scaffolds a new app:

- Shared “project” boilerplate
- Selected template (default: default)
- Seeds empty register placeholders in `app/generated/`

Options:

- `-t, --template <nameOrPath>` — template name (e.g., `default`) or a filesystem directory
- `--install [pm]` — install deps with npm|pnpm|yarn|bun
- `--no-install` — skip installation (overrides `-y`)
- `--cli` — scaffold a local `cli.ts` and add a `cli` script (`tsx cli.ts`)
- `-y, --yes` — no prompts
- `--dry-run` — show actions without writing

Defaults via smoz.config.json (optional):

```json
{
  "cliDefaults": {
    "init": {
      "template": "default",
      "onConflict": "example",
      "install": "auto"
    },
    "dev": { "local": "inline" }
  }
}
```

## register

```bash
npx smoz register
```

Scans `app/functions/**` for:

- `lambda.ts` → register.functions.ts
- `openapi.ts` → register.openapi.ts
- `serverless.ts` → register.serverless.ts (non‑HTTP)

One‑shot, idempotent, POSIX‑sorted, formatted when Prettier is available. For a live authoring loop that keeps registers (and OpenAPI) fresh, use `smoz dev` instead of a register watcher.

## add

```bash
npx smoz add rest/foo/get
npx smoz add step/activecampaign/contacts/getContact
npx smoz add rest/users/:id/get
```

Scaffold:

- HTTP: lambda.ts, handler.ts, openapi.ts
- non‑HTTP: lambda.ts, handler.ts

Paths must follow the convention under `app/functions/<eventType>/...`.

Path parameters

- You can write params as `:id`, `{id}`, or `[id]`:
  - Accepted spec forms (equivalent): `rest/users/:id/get`, `rest/users/{id}/get`, `rest/users/[id]/get`.
  - On disk, folders are Windows‑safe: `app/functions/rest/users/[id]/get/*`.
  - In code, lambda.ts uses a native API path: `basePath: 'users/{id}'`.
  - The scaffolded `openapi.ts` includes a path parameters array and a short “Path template” hint (e.g., `/users/{id}`).

Consuming path parameters (eventSchema & handler)

- Validate only what you need; the HTTP stack normalizes v1 events so `pathParameters` is an object before validation.
- String id (e.g., UUID):

```ts
export const eventSchema = z.object({
  pathParameters: z.object({
    id: z.string().uuid(), // or z.string().min(1)
  }),
});

export const handler = fn.handler(async (event) => {
  const id = event.pathParameters.id; // typed via ShapedEvent
  return { ok: true } as const;
});
```

- Numeric id (coerce to number for handler convenience):

```ts
export const eventSchema = z.object({
  pathParameters: z.object({
    id: z.coerce.number().int().positive(),
  }),
});
```

Portability

- `:` is not allowed in Windows paths. The CLI uses `[id]` on disk and `{id}` in code/docs to remain portable while staying native to API Gateway/OpenAPI.

## dev

```bash
npx smoz dev
```

Long‑running dev loop that watches source files and runs, in order. Inline is the default local backend; use `--local offline` to run serverless-offline.

1. `register` (if enabled)
2. `openapi` (if enabled)
3. local HTTP backend actions (restart/refresh if applicable)

Flags (CLI wins over config defaults; `cliDefaults.dev.local` sets the default):

- `-r, --register` / `-R, --no-register` (default: on)
- `-o, --openapi` / `-O, --no-openapi` (default: on)
- `-l, --local [mode]` — `inline` (default) or `offline`
- `-s, --stage <name>` — stage name (default inferred)
- `-p, --port <n>` — port (0=random)
- `-V, --verbose` — verbose logging

Root version flag:

- `-v, --version` — print `smoz` version (use `--verbose` with `dev` to control verbosity)

Notes:

- Inline backend maps Node HTTP → API Gateway v1 event → wrapped handler → response. It prints a route table and the selected port at startup.
- Offline backend runs `serverless offline` in a child process; when the route surface changes (register writes), the child is restarted automatically.
- The loop seeds basic env (e.g., `STAGE`) and prints “Updated” vs “No changes” per task run; bursts are debounced.
- Env seeding:
  - The dev loop imports `app/config/app.config.ts` and seeds `process.env` for keys declared in your app’s `global.envKeys` and `stage.envKeys`, using the concrete values from `stages.default.params` (global) and `stages[<stage>].params` (selected stage). Existing `process.env` entries are not overridden. This provides parity with provider-level env in production so handlers validate cleanly in dev.

## aws dynamodb

SMOZ includes the get-dotenv DynamoDB plugin from `@karmaniverous/entity-client-dynamodb` nested under `aws`, so the command surface is:

```bash
npx smoz aws dynamodb --help
```

Local DynamoDB orchestration is exposed under:

```bash
npx smoz aws dynamodb local start
npx smoz aws dynamodb local status
npx smoz aws dynamodb local stop
```

Notes:

- Configuration is provided via get-dotenv plugin config under the realized mount path:
  - `plugins['aws/dynamodb']`
- Local orchestration uses config-first behavior (run configured start/stop/status commands when present), and relies on native environment interpolation for:
  - `DYNAMODB_LOCAL_ENDPOINT`
  - `DYNAMODB_LOCAL_PORT`
- For general get-dotenv configuration, interpolation, and script execution behavior, see:
  - https://docs.karmanivero.us/get-dotenv

### Dynamic naming and versioned tables

SMOZ uses a versioned-table convention (e.g., `000`, `001`, …) to support safe migrations.

In SMOZ templates and the in-repo `/app` fixture, a common best-practice policy is:

- `STAGE_NAME` is a first-class param (often `${SERVICE_NAME}-${STAGE}`).
- `TABLE_VERSION` is the code-expected table version (tracked).
- `TABLE_VERSION_DEPLOYED` is the currently deployed version (private / env-managed).
- Canonical runtime names are derived from those inputs:
  - `TABLE_NAME = ${STAGE_NAME}-${TABLE_VERSION}`
  - `TABLE_NAME_DEPLOYED = ${STAGE_NAME}-${TABLE_VERSION_DEPLOYED}`

Important: versioned DynamoDB tables are typically created by **Serverless deploy** via
imported CloudFormation resources (multiple versions can coexist during migration).
The DynamoDB CLI plugin can provide lifecycle/migration helpers, but templates do not
assume “create tables via CLI” as the default path.
