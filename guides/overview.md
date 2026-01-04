---
title: Overview
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
