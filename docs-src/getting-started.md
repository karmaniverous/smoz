---
title: Getting Started
---

# Getting started

## Quick start (from zero)

```bash
npx @karmaniverous/smoz init -i
npx smoz dev -p 3000
```

- The first command scaffolds a new app and installs dependencies (including a local `smoz` bin).
- The second command starts the inline local backend and keeps registers + OpenAPI fresh.
- Browse http://localhost:3000/openapi

Offline option (serverless‑offline):

```bash
npx smoz dev -l offline -p 3000
```

Add your first endpoint:

```bash
npx smoz add rest/foo/get
```

## Install

```bash
npm i @karmaniverous/smoz zod zod-openapi
```

Dev tooling (recommended):

```bash
npm i -D typescript typescript-eslint eslint prettier typedoc
```

## Initialize a new app

```bash
npx smoz init --yes
```

This scaffolds:

- app/config/app.config.ts — schemas/config (params, env, http tokens)
- app/functions/\*\* — endpoints (rest/http and non‑HTTP)
- app/generated/\*\* — registers and OpenAPI JSON placeholder
- serverless.ts — uses the app registry to build functions
- scripts, lint/typecheck/docs configs

Optional defaults (smoz.config.json):

- `cliDefaults.init` — set `template`, `onConflict`, and `install`
- `cliDefaults.dev.local` — set default local mode (`inline`|`offline`)

## Generate registers and OpenAPI

```bash
npx smoz register
npm run openapi
```

`openapi` will:

1. Import `app/generated/register.openapi.ts`
2. Call `app.buildAllOpenApiPaths()`
3. Write `app/generated/openapi.json`

## Live dev loop (optional)

Use the dev loop to keep registers/OpenAPI fresh and (optionally) serve HTTP:

```bash
npx smoz dev
```

See the CLI page for flags and inline/offline details. Inline is the default backend for --local; use `--local offline` to run serverless-offline instead.

## Package or deploy with Serverless

```bash
npm run package   # no deploy
# or
npm run deploy
```

Serverless picks up:

- `functions` from `app.buildAllServerlessFunctions()`
- Provider‑level env from `app.environment`
- Stages/params from `app.stages`

## Author an endpoint (HTTP)

```ts
// app/functions/rest/hello/get/lambda.ts
import { dirname, join } from 'node:path'; // example for path helpers
import { z } from 'zod';
import { app } from '@/app/config/app.config';

export const responseSchema = z.object({ ok: z.boolean() });

export const fn = app.defineFunction({
  functionName: 'hello_get',
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'hello',
  contentType: 'application/json',
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: dirname(new URL('../..', import.meta.url).pathname),
});
```

```ts
// app/functions/rest/hello/get/handler.ts
import type { z } from 'zod';
import type { responseSchema } from './lambda';
import { fn } from './lambda';
type Response = z.infer<typeof responseSchema>;
export const handler = fn.handler(
  async () => ({ ok: true }) satisfies Response,
);
```

```ts
// app/functions/rest/hello/get/openapi.ts
import { fn, responseSchema } from './lambda';
fn.openapi({
  summary: 'Hello',
  description: 'Return a simple OK payload.',
  responses: {
    200: {
      description: 'Ok',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['public'],
});
```

Re‑generate:

```bash
npx smoz register
npm run openapi
```

## Contributing and local DX

- Run once locally: `npm run stan:build` in the smoz repo so editors resolve `@karmaniverous/smoz` types across templates.
- Lint & format: ESLint drives Prettier (`prettier/prettier`: error). Use:
  ```bash
  npm run lint:fix
  npm run templates:lint
  ```
- Typecheck:
  ```bash
  npm run typecheck
  npm run templates:typecheck
  ```
