---
title: Why SMOZ?
---

# Why smoz?

SMOZ is a tiny, pragmatic toolkit that favors explicit design over magic:

- Small surface area
  - Author Lambda handlers with [Middy] and first‑class [Zod] validation.
  - Define your app once and generate:
    - Serverless functions (handler strings, HTTP events, env mapping)
    - OpenAPI 3.1 paths (hand‑crafted)
- Keep prod code small and testable (no framework lock‑in).

## Philosophy

- Contract‑first: OpenAPI is authored, not reverse‑generated.
- Schema‑first: Zod validates inputs/outputs; types flow from schemas.
- Explicit wiring: a tiny registry collects per‑endpoint modules and emits
  Serverless + OpenAPI artifacts.
- HTTP/non‑HTTP split: HTTP gets a robust, customizable middleware stack;
  non‑HTTP paths stay lean (no overhead).

## Compared to alternatives

- Full frameworks (SST/NestJS/tsoa)
  - Pros: batteries‑included; stronger opinions.
  - Cons: larger surface, more indirection, harder to extract testable core.
  - SMOZ: keep code close to the platform; add only thin, well‑scoped helpers.

- “Auto‑OpenAPI from code”
  - Pros: fewer files at first.
  - Cons: drift and surprise are common; often leaky abstractions.
  - SMOZ: the OpenAPI you publish is what you wrote. No guessing.

## When to choose SMOZ

- You want a minimal toolkit that plays nicely with your existing stack.
- You need to stitch together hand‑crafted paths, not a full router.
- You want tests to hit small, composable handlers and services.
- You have both HTTP and non‑HTTP flows (SQS/Step/etc.) and want one mental
  model for both.
- You value schema‑first types (Zod) and explicit, inspectable wiring.
- You want incremental adoption without framework lock‑in.

## How it feels in practice

- One app, tiny surface:
  - `App.create({...})` holds global/stage params, env keys, and serverless
    defaults.
  - `fn = app.defineFunction({...})` in small per‑endpoint modules:
    - `lambda.ts` (registration + schemas)
    - `handler.ts` (business logic)
    - `openapi.ts` (operation metadata)
- Aggregation without magic:
  - `npx smoz register` writes side‑effect registers (imports your endpoint
    modules).
  - `npm run openapi` builds `app/generated/openapi.json`.
  - `npm run package` lets Serverless package using the registry’s outputs.
- HTTP defaults you don’t have to babysit:
  - HEAD short‑circuit, header/event normalization, content negotiation, safe
    JSON body parsing, Zod validation before/after, error exposure with 400
    mapping, CORS, shaping, and serialization.
- Non‑HTTP stays lean:
  - Same handler signature, no Middy stack; just your business code.

Example (happy path):

```ts
// app/functions/rest/hello/get/lambda.ts
import { z } from 'zod';
import { app } from '@/app/config/app.config';

export const responseSchema = z.object({ ok: z.boolean() });
export const fn = app.defineFunction({
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'hello',
  contentType: 'application/json',
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: /* app/functions/rest root */,
});
```

```ts
// app/functions/rest/hello/get/handler.ts
import type { z } from 'zod';
import type { responseSchema } from './lambda';
import { fn } from './lambda';
type Response = z.infer<typeof responseSchema>;
export const handler = fn.handler(
  async (): Promise<Response> => ({ ok: true }),
);
```

## Easy to try & adopt

- Two commands from zero:

```bash
npx @karmaniverous/smoz init -i
npx smoz dev -p 3000
```

- Inline local backend prints routes and serves `/openapi`. Prefer
  `serverless-offline`? Use `--local offline`.
- Incremental adoption:
  - Start by authoring one endpoint with SMOZ in an existing Serverless repo.
  - Registers and aggregation are files in your tree; nothing magical or global.
  - Keep your deployment story; SMOZ just gives you a clean authoring loop.

## Will API devs love it?

- Schema‑first types that stick:
  - `Handler<EventSchema, ResponseSchema, EventType>` with a `ShapedEvent` that
    reflects Zod overrides.
  - Typed env: list per‑function extras via `fnEnvKeys`; the app supplies
    provider‑level env from global/stage keys.
- A stack that feels right:
  - Robust defaults + opt‑in customization via profiles, options, extend,
    and transforms (`insertAfter('shape', ...)`, `replaceStep`, etc.).
  - Escape hatch: fully replace phases when you need to.
- Minimal import surface, clear boundaries:
  - No heavy decorators or hidden side effects; your code stays plain TypeScript.

Tiny customization example:

```ts
import { insertAfter } from '@karmaniverous/smoz';
const xHeader = { after: (r: any) => (r.response.headers['X-Trace'] = '1') };
export const fn = app.defineFunction({
  eventType: 'rest',
  method: 'get',
  basePath: 'hello',
  httpContexts: ['public'],
  http: {
    transform: ({ before, after, onError }) => ({
      before,
      after: insertAfter(after, 'shape', xHeader as never),
      onError,
    }),
  },
  // ...
});
```

## When not to use SMOZ

- You want a batteries‑included framework with opinions about everything
  (routing, persistence, DI, background jobs, view layer).
- You prefer reverse‑generating OpenAPI from decorators and accept the drift.
- You’re targeting GraphQL‑first or an ecosystem that already dictates a
  end‑to‑end framework.
