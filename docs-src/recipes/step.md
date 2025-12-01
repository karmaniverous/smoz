---
title: Step Functions Function
---

# Step Functions Walkthrough

When Step Functions invokes a Lambda via the AWS SDK integration (`"arn:aws:states:::lambda:invoke"`), the event received by the handler wraps the original input under a `Payload` key. The `Payload` itself is already parsed JSON.

SMOZ’s base event map includes a first-class `step` token that reflects this common pattern:

```ts
// Conceptual shape:
z.object({ Payload: z.unknown().optional() }).catchall(z.unknown());
```

This recipe walks through creating and configuring a non-HTTP Step Functions task.

### 1. Add a Step Function Task

Use the `add` command to scaffold the files for a `step` event type.

```bash
npx smoz add step/exampleTask
```

This creates:

- `app/functions/step/exampleTask/lambda.ts`
- `app/functions/step/exampleTask/handler.ts`

### 2. Define the Function (lambda.ts)

Update `lambda.ts` to define the function's schemas. Here, we'll validate that the `Payload` is an object containing a `foo` string.

````ts
// app/functions/step/exampleTask/lambda.ts
import { join } from 'node:path';
import { z } from 'zod';
import { app, APP_ROOT_ABS } from '@/app/config/app.config';

// Validate the expected structure of the "Payload" from Step Functions.
export const eventSchema = z.object({
  Payload: z.object({ foo: z.string() }).optional(),
});

export const responseSchema = z.any().optional(); // Step Functions can capture output

export const fn = app.defineFunction({
  functionName: 'exampleTask',
  eventType: 'step', // non-HTTP
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'step').replace(/\\/g, '/'),
});```

### 3. Implement the Handler (handler.ts)

The business logic in your handler can now safely access the typed `Payload`.

```ts
// app/functions/step/exampleTask/handler.ts
import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  // `event` is shaped by the eventSchema, so `Payload` is typed.
  const payload = event.Payload;

  console.log('Received foo:', payload?.foo);

  // You can return a value to be passed to the next state.
  return { result: `Processed ${payload?.foo}` };
});
````

### 4. Generate and Package

Because this is a non-HTTP function, no `serverless.ts` is needed unless you want to attach other triggers. The function is defined and can be referenced by its ARN in your Step Functions state machine definition.

First, update the registers:

```bash
npx smoz register
```

Then, package the application:

```bash
npm run package
```

Your Step Function can now invoke this Lambda using its generated ARN.
