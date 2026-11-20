---
title: SQS function
sidebar_label: SQS function
---

# SQS function

Author a non‑HTTP function and attach an SQS event via a sibling `serverless.ts`.

## Registration (lambda.ts)

```ts
import { z } from 'zod';
import { app } from '@/app/config/app.config';

// Validate what the handler relies on; a failure throws and fails the batch.
export const eventSchema = z.object({
  Records: z.array(z.object({ body: z.string() }).loose()),
});
export const responseSchema = z.void(); // or z.any().optional()

export const fn = app.defineFunction({
  eventType: 'sqs',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url, // e.g. app/functions/sqs/ingest/lambda.ts
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

- Non‑HTTP flows bypass the HTTP middleware; the wrapper still runs `eventSchema` before your handler and `responseSchema` after it, and throws `Invalid event` / `Invalid response` on failure (for SQS: the batch fails, is retried, then goes to the dead-letter queue). The handler receives the parsed output on the keys the schema declares. See [Validation and the handler event](./validation.md).
- The app registry aggregates these extras when building functions; import `app/generated/register.serverless.ts` in your top‑level `serverless.ts`.
