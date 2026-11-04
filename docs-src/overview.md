---
title: Overview
sidebar_label: Overview
sidebar_position: 1
---

# SMOZ overview

SMOZ is a tiny, pragmatic toolkit:

- Author Lambda handlers with Middy and first‑class Zod validation
- Define your app once and generate:
  - Serverless functions (handler strings, HTTP events, env mapping)
  - OpenAPI 3.1 paths (hand‑crafted, no magic)
- Keep prod code small and testable (no framework lock‑in)

Why this stack?

- Serverless makes deployment boring
- Middy is the right level of middleware
- OpenAPI is your contract (hand‑crafted here—no leaky auto‑gen)
- Zod is a fast, composable runtime validator that doubles as types

## Core ideas

- Schema‑first App
  - Define global/stage params and env keys
  - Register functions once, then aggregate Serverless + OpenAPI
- HTTP runtime wrapper
  - Event/body normalization, content negotiation
  - Zod validation before/after the handler
  - Error exposure with 400 mapping for validation
  - CORS, JSON, HEAD short‑circuit
- Non‑HTTP stays lean
  - Bypass Middy entirely; same options surface

## Quick mental model

1. You register endpoints with `app.defineFunction({ ... })` in small per‑endpoint modules (lambda.ts, handler.ts, optional openapi.ts).
2. A tiny CLI keeps “register” files up to date:
   ```
   npx smoz register
   ```
3. Serverless and OpenAPI aggregate from the registry:
   ```ts
   // serverless.ts
   import '@/app/generated/register.functions';
   import '@/app/generated/register.serverless';
   export default { functions: app.buildAllServerlessFunctions() };
   ```
   ```ts
   // app/config/openapi.ts
   import '@/app/generated/register.openapi';
   const paths = app.buildAllOpenApiPaths();
   ```

## What `defineFunction` derives from the path

A function's folder under `app/functions` already says most of what SMOZ needs. Only `callerModuleUrl` is required; for `app/functions/rest/users/get/lambda.ts`:

| Field              | Derived value                 | Rule                                                                               |
| ------------------ | ----------------------------- | ---------------------------------------------------------------------------------- |
| `eventType`        | `'rest'`                      | First folder under `<appRootAbs>/functions`; must be a key of `eventTypeMapSchema` |
| `endpointsRootAbs` | `<appRootAbs>/functions/rest` | `<appRootAbs>/functions/<eventType>`                                               |
| `method`           | `'get'`                       | Last folder (HTTP only)                                                            |
| `basePath`         | `'users'`                     | Folders between `endpointsRootAbs` and the method folder (HTTP only)               |
| `functionName`     | `functions_rest_users_get`    | Folder relative to `appRootAbs`, joined with `_`                                   |
| `httpContexts`     | `['public']`                  | Built-in default                                                                   |
| `contentType`      | `'application/json'`          | Built-in default                                                                   |

```ts
// app/functions/rest/users/get/lambda.ts
import { z } from 'zod';

import { app } from '@/app/config/app.config';

export const responseSchema = z.array(z.object({ id: z.string() }));

export const fn = app.defineFunction({
  eventType: 'rest', // optional; see below
  responseSchema,
  callerModuleUrl: import.meta.url,
});
```

An explicit field always wins over a derived one, so set `basePath` or `functionName` where a function departs from its folder. If `eventType` is omitted and the file isn't under `functions/<eventType>/`, or that folder isn't a key of `eventTypeMapSchema`, `defineFunction` throws when the module loads, naming the fix.

`eventType` is worth passing even though it can be derived: given explicitly, the literal token types the handler's event (e.g. `APIGatewayProxyEvent` for `'rest'`). Omitted, the handler's event type widens to the union of all event types in the map.

### App-wide defaults (`functionDefaults`)

Where your functions share a value that differs from the built-in default, set it once in `App.create`:

```ts
export const app = App.create({
  // ...
  functionDefaults: {
    httpContexts: ['my', 'private'],
    fnEnvKeys: ['TABLE_NAME'],
    // 'kebab': functions/rest/user/logo/patch -> 'user-logo-patch'
    functionName: 'kebab',
  },
});
```

Precedence for every field: the function's own value, then `functionDefaults`, then the built-in default. In detail:

- `fnEnvKeys` merge with the function's keys (no duplicates).
- `http` combines with the function's `http`: each key the function sets (`profile`, `extend`, `transform`, `replace`) wins, and `options` merge key by key, the function's keys winning. The result is the function-level layer of the [middleware stack](./middleware.md), applied after the selected profile; use the app's `http.defaults` for defaults that profiles can override.
- `functionName` is a name style, used only when a function sets no `functionName`: `'kebab'`, or a function `(ctx) => string` receiving `eventType`, `segments` (folders under `endpointsRootAbs`, e.g. `['user', 'logo', 'patch']`) and `defaultName` (the built-in name). Changing a style renames deployed functions.
- `httpContexts`, `contentType` and `http` only affect HTTP functions.

## Path hygiene (cross‑platform)

Windows uses backslashes, which can leak into string comparisons and generated artifacts. Normalize consistently:

```ts
import { toPosixPath } from '@karmaniverous/smoz';
```

## Where next

- Getting started
- CLI
- Middleware
- Templates
