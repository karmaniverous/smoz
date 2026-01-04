---
title: 10‑Minute Tour
---

# 10‑minute tour

End‑to‑end in one sitting: init → add → register → openapi → package → curl.

## 1) Initialize a new app

```bash
npx smoz init --yes
```

This scaffolds:

- `app/config/app.config.ts` — schemas/config (params, env, http tokens)
- `app/functions/**` — endpoints (rest/http and non‑HTTP)
- `app/generated/**` — registers + OpenAPI placeholder
- `serverless.ts` — builds functions from the app registry

## 2) Add your first endpoint

```bash
npx smoz add rest/foo/get
```

This creates:

- `app/functions/rest/hello/get/lambda.ts` — registration (method, basePath, schemas)
- `app/functions/rest/hello/get/handler.ts` — business handler
- `app/functions/rest/hello/get/openapi.ts` — OpenAPI operation

Open lambda.ts:

```ts
export const fn = app.defineFunction({
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'hello',
  contentType: 'application/json',
  eventSchema: z.object({}).optional(),
  responseSchema: z.object({ ok: z.boolean() }),
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: /* app/functions/rest root */,
});
```

## 3) Register endpoints (side‑effects)

```bash
npx smoz register
```

This writes side‑effect files under `app/generated/`:

- `register.functions.ts` — imports all `lambda.ts`
- `register.openapi.ts` — imports all `openapi.ts`
- `register.serverless.ts` — imports any per‑function `serverless.ts`

Tip: Commit the generated `register.*.ts` so typecheck is stable.

## 4) Build OpenAPI

```bash
npm run openapi
```

This imports `register.openapi.ts`, collects paths via `app.buildAllOpenApiPaths()`, and writes `app/generated/openapi.json`.

Alternative: run a live loop that keeps registers/OpenAPI fresh and serves HTTP:

```bash
npx smoz dev --local inline
```

Use `--local offline` to drive serverless-offline instead.

## 5) Package with Serverless

```bash
npm run package
```

Serverless picks up:

- `functions` from `app.buildAllServerlessFunctions()`
- provider env from `app.environment`
- stages/params from `app.stages`

## 6) Curl it (locally or after deploy)

After you wire a dev endpoint or deploy, curl the route:

```bash
curl https://your-api/hello
```

Expected:

```json
{ "ok": true }
```

## Path parameters (bonus)

SMOZ supports native `{id}` path segments while keeping Windows‑safe folders:

- Spec input you can use: `rest/users/:id/get`, `rest/users/{id}/get`, or `rest/users/[id]/get`
- On disk: `app/functions/rest/users/[id]/get/*`
- In code: `basePath: 'users/{id}'`
- OpenAPI: includes a path parameter entry for `id`

## Non‑HTTP flows (bonus)

For SQS/Step/etc., author the same way but skip HTTP options:

```ts
// lambda.ts (non‑HTTP)
export const fn = app.defineFunction({
  eventType: 'sqs',
  eventSchema: z.any(),
  responseSchema: z.any().optional(),
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: /* app/functions/sqs root */,
});
```

Attach platform events in a sibling `serverless.ts`:

```ts
// serverless.ts (non‑HTTP extras)
import { fn } from './lambda';
fn.serverless([
  { sqs: { arn: 'arn:aws:sqs:us-east-1:123456789012:my-queue' } },
]);
```

## Next

- Read the [Middleware](./middleware.md) page to customize the HTTP stack.
- Explore the [Recipes](./recipes/index.md) for SQS, Cognito auth contexts, custom middleware, per‑function env, and observability helpers.
