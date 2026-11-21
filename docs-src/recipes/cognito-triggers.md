---
title: Cognito triggers
sidebar_label: Cognito triggers
---

# Cognito triggers

Cognito user-pool triggers (pre sign-up, custom message, pre token generation, ...) are non-HTTP functions with `eventType: 'cognito-userpool'`. Cognito invokes the function with the trigger event and expects the **event back**, with `response` filled in.

That makes `responseSchema` unusual: it describes what the handler returns, the event plus `response`, and the handler only has the **parsed** event (see [Validation and the handler event](./validation.md)). So `responseSchema = eventSchema.extend({ response })` breaks as soon as `eventSchema` transforms anything: a field the event schema turns from `'true'` into `true` comes back as `true`, which the extended schema (expecting its input, a string) rejects. The types catch it; at runtime every invocation would fail with `Invalid response`.

## Recommended: validate `response` only

Validate the parts of the event the handler reads, and only `response` in what it returns:

```ts
// app/functions/cognito-userpool/preTokenGeneration/lambda.ts
import { z } from 'zod';

import { app } from '@/app/config/app.config';

// What the handler reads, parsed: email_verified arrives as 'true' / 'false'.
export const eventSchema = z.object({
  request: z.looseObject({
    userAttributes: z.looseObject({
      sub: z.string(),
      email_verified: z.stringbool().default(false),
    }),
  }),
});

// What the handler returns: the event, with a checked response.
export const responseSchema = z.looseObject({
  response: z.object({
    claimsOverrideDetails: z.object({
      claimsToAddOrOverride: z.record(z.string(), z.string()),
    }),
  }),
});

export const fn = app.defineFunction({
  eventType: 'cognito-userpool',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
});
```

```ts
// app/functions/cognito-userpool/preTokenGeneration/handler.ts
import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  await Promise.resolve();
  const { sub, email_verified } = event.request.userAttributes; // boolean
  return {
    ...event,
    response: {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          tenant: `tenant-${sub}`,
          verified: String(email_verified),
        },
      },
    },
  };
});
```

Cognito reads the returned `response`; the rest of the event comes back as the handler received it (`request` parsed, everything undeclared untouched).

Attach the trigger to the user pool in the function's `serverless.ts`:

```ts
import { fn } from './lambda';

fn.serverless([
  {
    cognitoUserPool: {
      pool: 'my-user-pool',
      trigger: 'PreTokenGeneration',
      existing: true,
    },
  },
]);
```

## Other options

- **Keep transforms out of the echoed parts.** Declare fields as Cognito sends them (`email_verified: z.enum(['true', 'false'])`) and convert in the handler. Then `responseSchema = eventSchema.extend({ response })` holds, at the cost of parsing by hand.
- **Accept both forms** where a field is transformed, e.g. `z.union([z.boolean(), z.stringbool()])` in the response schema. Only worth it when the response must be checked field by field.

## Failures

An event that fails `eventSchema` throws `Invalid event`, and a result that fails `responseSchema` throws `Invalid response`. Cognito treats either as a failed trigger, so the user's sign-in or sign-up fails with an error. The Zod issues are in the function's logs.

See also: [Contexts + Cognito authorizer](./contexts-auth.md) (API Gateway authorizers, not triggers).
