---
title: Step Functions
---

# Step Functions function

When Step Functions invokes Lambda via the AWS SDK integration
("arn:aws:states:::lambda:invoke"), the event received by the Lambda handler
is an object that wraps the original input under a `Payload` key. The Payload
is already parsed JSON.

SMOZ’s base event map includes a first‑class `step` token that reflects this:

```ts
// Conceptual shape (Zod v4):
z.object({ Payload: z.unknown().optional() }).catchall(z.unknown());
```

Notes:

- Zod v4 deprecates `.passthrough()`. Use `.catchall(z.unknown())` to allow
  additional properties (e.g., `StatusCode`, `ExecutedVersion`) while keeping a
  typed `Payload` key.
- If your integration passes state directly (no wrapper), you can still define
  an app‑local event token with your preferred shape; the base `step` token
  covers the common “Lambda Invoke” pattern.

## Minimal registration and handler

```ts
// app/functions/step/exampleTask/lambda.ts
import { z } from 'zod';
import { app, APP_ROOT_ABS } from '@/app/config/app.config';
import { join } from 'node:path';

// Validate only the part you use; here we expect an object payload.
export const eventSchema = z.object({
  Payload: z.object({ foo: z.string() }).optional(),
});
export const responseSchema = z.void(); // or z.any().optional()

export const fn = app.defineFunction({
  functionName: 'exampleTask',
  eventType: 'step', // non‑HTTP
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'step').replace(/\\/g, '/'),
});
```

```ts
// app/functions/step/exampleTask/handler.ts
import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  // The wrapper event may include Payload; validate its structure as needed.
  const payload = (event as { Payload?: unknown }).Payload as
    | { foo?: string }
    | undefined;
  // ... do work ...
});
```

## Tips

- If you need a stricter guarantee for additional keys, replace
  `catchall(z.unknown())` with a tighter schema or a pipeline that drops/normalizes
  unexpected properties before the handler runs.
- For dictionary‑style payloads (all keys share one schema), prefer `z.record`
  on the nested Payload.
- If you own both the Step Functions definition and the Lambda, keep the input
  contract small and explicit. Validate only what you read—Zod v4’s object with
  `catchall` maps well to OpenAPI’s `additionalProperties` pattern.
