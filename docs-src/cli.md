---
title: CLI
sidebar_label: CLI
sidebar_position: 5
---

# CLI

## From zero in two commands

```bash
npx -p @karmaniverous/get-dotenv@^8.0.0-0 -p @karmaniverous/smoz smoz init
npx smoz dev -p 3000
```

- The first command scaffolds a new app and installs dependencies (including a local `smoz` bin).
- The second command starts the inline local backend; open http://localhost:3000/openapi
- Prefer serverless‑offline? Use `-l offline`: `npx smoz dev -l offline -p 3000`

This mirrors the README quickstart for the fastest path to “it runs.”

## Signature

```bash
npx smoz -h
```

Prints smoz's version and description, the root options and the commands. `smoz <command> -h` prints a command's help.

Print the CLI version:

```bash
npx smoz -V
```

`-v` is not the version: it is get-dotenv's `-v, --vars` root option (extra variables, `KEY1=VAL1 KEY2=VAL2`).

## init

```bash
npx smoz init --yes
```

`npx smoz` runs the `smoz` bin installed in your project (with `@karmaniverous/get-dotenv` ^8.0.0-0, which the CLI needs). First‑time npx note: in an empty directory, run `npx -p @karmaniverous/get-dotenv@^8.0.0-0 -p @karmaniverous/smoz smoz init` instead — it uses the published packages and installs the template's dependencies (get-dotenv included), so subsequent `npx smoz …` commands run from your local bin.

Scaffolds a new app:

- Shared “project” boilerplate
- Selected template (default: default)
- Seeds empty register placeholders in `app/generated/`

Options:

- `-t, --template <name>` — template name (default: `default`) or a filesystem directory
- `-y, --yes` — no prompts; conflicts write `*.example` files
- `--conflict <policy>` — `overwrite`, `example`, `skip` or `ask`
- `--install <pm>` — install dependencies with npm, pnpm, yarn or bun
- `--no-install` — don't install dependencies

Dependencies are installed by default, with the package manager detected from the directory.

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

The generated `lambda.ts` sets only the schemas and `callerModuleUrl`. The event type, method, base path, function name, contexts and content type derive from the folder and the app's `functionDefaults` (see "What `defineFunction` derives from the path" in the [Overview](./overview.md)); add a field to override it.

Path parameters

- You can write params as `:id`, `{id}`, or `[id]`:
  - Accepted spec forms (equivalent): `rest/users/:id/get`, `rest/users/{id}/get`, `rest/users/[id]/get`.
  - On disk, folders are Windows‑safe: `app/functions/rest/users/[id]/get/*`.
  - In code, lambda.ts uses a native API path: `basePath: 'users/{id}'`. This is the one field `add` writes explicitly, because the folder path (`users/[id]`) isn't the API path.
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

## openapi

```bash
npx smoz openapi
```

One-shot: runs `app/config/openapi.ts` with tsx to write `app/generated/openapi.json`, then formats that file with Prettier. tsx and Prettier must be installed for the project (as dev dependencies). They are found the way Node resolves packages: the nearest copy wins, searching the project's own `node_modules` first, then each parent directory's. So in an npm workspaces monorepo a service in `packages/service` uses the copies npm hoisted to the repo root, unless it installs its own. Prettier must be installed in the project or a parent directory: a global install (including one reached through `NODE_PATH`) isn't used.

## dev

```bash
npx smoz dev
```

Long‑running dev loop that watches source files and runs, in order. Inline is the default local backend; use `--local offline` to run serverless-offline.

1. `register` (if enabled)
2. `openapi` (if enabled)
3. local HTTP backend actions (restart/refresh if applicable)

Flags:

- `-r, --register` / `-R, --no-register` (default: on)
- `-o, --openapi` / `-O, --no-openapi` (default: on)
- `-l, --local [mode]` — `inline` (default) or `offline`
- `-s, --stage <name>` — stage name (default inferred)
- `-p, --port <n>` — port (0=random)
- `-V, --verbose` — verbose logging

Root version flag:

- `-V, --version` — print the `smoz` version. On `dev` and `openapi`, `-V` is `--verbose`.

Notes:

- Inline backend maps Node HTTP → API Gateway v1 event → wrapped handler → response. It prints a route table and the selected port at startup. Request bodies whose Content-Type matches `provider.apiGateway.binaryMediaTypes` in `serverless.ts` arrive base64-encoded with `isBase64Encoded: true`, as API Gateway sends them; other bodies arrive as UTF-8 text. Response bodies a handler returns with `isBase64Encoded: true` are decoded to bytes. The list is read once at startup, and the startup output prints it: restart after changing it. Without a loadable `serverless.ts`, dev uses a fallback list (see [Multipart form data](./middleware.md#multipart-form-data-opt-in)).
- Offline backend runs `serverless offline` in a child process, using the project's installed `serverless` (found like Prettier in [openapi](#openapi), including a copy hoisted to a workspace root, and looked up again on each restart) or else the one on PATH; when the route surface changes (register writes), the child is restarted automatically.
- The loop seeds basic env (e.g., `STAGE`) and prints “Updated” vs “No changes” per task run; bursts are debounced.
- Env seeding:
  - The dev loop imports `app/config/app.config.ts` and seeds `process.env` for keys declared in your app’s `global.envKeys` and `stage.envKeys`, using the concrete values from `stages.default.params` (global) and `stages[<stage>].params` (selected stage). Existing `process.env` entries are not overridden. This provides parity with provider-level env in production so handlers validate cleanly in dev.
