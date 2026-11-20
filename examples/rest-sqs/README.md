# Example: REST + SQS (non-HTTP)

Adds a non-HTTP SQS function, triggered by a queue, to the default template.

Prerequisites

- Node 22.19 or later
- A package manager (npm/pnpm/yarn/bun)

Steps

1. Create a fresh directory and initialize the template:
   ```bash
   mkdir smoz-rest-sqs && cd smoz-rest-sqs
   npx -p @karmaniverous/get-dotenv@^8.0.0 -p @karmaniverous/smoz smoz init --yes
   ```
2. Add an SQS function:
   ```bash
   npx smoz add sqs/tick
   ```
   This creates `app/functions/sqs/tick/lambda.ts` (with `eventType: 'sqs'`) and `handler.ts`. The handler's event is typed as `SQSEvent`.
3. Validate what the handler relies on. In `lambda.ts`:
   ```ts
   export const eventSchema = z.object({
     Records: z.array(z.looseObject({ body: z.string() })),
   });
   export const responseSchema = z.void();
   ```
   An event that fails the schema throws `Invalid event`; for SQS the batch fails, is retried, then goes to the dead-letter queue if one is configured. The handler stub returns `{}`; change it to return nothing to match `z.void()`.
4. Attach the SQS trigger. Create `app/functions/sqs/tick/serverless.ts`:

   ```ts
   import { fn } from './lambda';

   // Replace the ARN with your queue's.
   fn.serverless([
     { sqs: { arn: 'arn:aws:sqs:us-east-1:123456789012:my-queue' } },
   ]);
   ```

5. Generate registers and OpenAPI, then typecheck:
   ```bash
   npx smoz register
   npm run openapi
   npm run typecheck
   ```
   Non-HTTP functions don't appear in `openapi.json`.
6. Package with Serverless (no deploy):
   ```bash
   npm run package
   ```
   Serverless Framework v4 asks you to log in (or set `SERVERLESS_ACCESS_KEY`) first.

Notes

- Non-HTTP functions bypass the HTTP middleware, but the wrapper still runs `eventSchema` before the handler and `responseSchema` after it. The handler receives the parsed output on the keys the schema declares. See [Validation and the handler event](../../docs-src/recipes/validation.md).
- The registry aggregates the extras in each function's `serverless.ts`; the template's top-level `serverless.ts` already imports `@/app/generated/register.serverless`.

Troubleshooting

- "module not found" for `app/generated/register.*`: run `npx smoz register`.
