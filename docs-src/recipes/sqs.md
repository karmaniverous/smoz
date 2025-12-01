---
title: SQS function
---

# SQS function

Author a non‑HTTP function and attach an SQS event via a sibling `serverless.ts`.

## Registration (lambda.ts)

```ts
import { z } from 'zod';
import { app } from '@/app/config/app.config';

export const eventSchema = z.any();          // validate as needed
export const responseSchema = z.void();      // or z.any().optional()

export const fn = app.defineFunction({
  eventType: 'sqs',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: /* app/functions/sqs root */,
});
```

## Handler (handler.ts)

```ts
import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  // process SQS batch event
  void event;
});
```

## Serverless extras (serverless.ts)

```ts
import { fn } from './lambda';
fn.serverless([
  { sqs: { arn: 'arn:aws:sqs:us-east-1:123456789012:my-queue' } },
]);
```

Notes

- Non‑HTTP flows bypass the HTTP middleware; your handler receives raw events (shaped only by any Zod schemas you provide).
- The app registry aggregates these extras when building functions; import `app/generated/register.serverless.ts` in your top‑level `serverless.ts`.
