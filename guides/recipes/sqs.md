---
title: SQS Function
---

# SQS Function Walkthrough

This guide provides an end-to-end example of creating a non-HTTP SQS function, from initializing a new app to packaging it.

### 1. Initialize a New App

Start by creating a fresh directory and scaffolding a new SMOZ app using the `init` command.

```bash
mkdir -p /tmp/smoz-rest-sqs && cd /tmp/smoz-rest-sqs
npx smoz init --yes
```

### 2. Add an SQS Function

Next, use the `add` command to scaffold the necessary files for an `sqs` event type.

```bash
npx smoz add sqs/tick
```

This command creates two files:

- `app/functions/sqs/tick/lambda.ts`
- `app/functions/sqs/tick/handler.ts`

### 3. Define the Function (lambda.ts)

The generated `lambda.ts` will contain a placeholder. Update it to define your function's schemas and registration details. For an SQS trigger, the event schema typically validates the message body, but `z.any()` is a safe starting point.

```ts
// app/functions/sqs/tick/lambda.ts
import { z } from 'zod';
import { app } from '@/app/config/app.config';

export const eventSchema = z.any(); // or a specific schema for your SQS message body
export const responseSchema = z.void(); // SQS consumers usually don't return a value

export const fn = app.defineFunction({
  eventType: 'sqs',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: /* app/functions/sqs root */,
});
```

### 4. Implement the Handler (handler.ts)

Write your business logic in the handler. Non-HTTP flows bypass the Middy middleware stack, so your handler receives the raw SQS event (shaped only by your Zod `eventSchema`).

```ts
// app/functions/sqs/tick/handler.ts
import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  // Process SQS batch event
  console.log('Received SQS event:', JSON.stringify(event, null, 2));
  // ... your logic here
});
```

### 5. Attach the SQS Event Trigger

For non-HTTP functions, you must manually attach the Serverless event trigger. Create a `serverless.ts` file alongside your `lambda.ts` and `handler.ts`.

```ts
// app/functions/sqs/tick/serverless.ts
import { fn } from './lambda';

// Attach an SQS trigger (replace with your queue ARN)
fn.serverless([
  { sqs: { arn: 'arn:aws:sqs:us-east-1:123456789012:my-queue' } },
]);
```

### 6. Generate Artifacts

Run the `register` command to update the side-effect registers. This ensures your new `lambda.ts` and `serverless.ts` files are imported by the application.

```bash
npx smoz register
```

### 7. Package the Application

Finally, run the package command to see the result in your `.serverless` directory.

```bash
npm run package
```

The app registry aggregates the extras from `serverless.ts` when building the function definitions. Ensure your top-level `serverless.ts` imports `@/app/generated/register.serverless` to include these configurations.
