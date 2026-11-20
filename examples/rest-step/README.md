# Example: REST + Step Functions (non-HTTP)

Adds a non-HTTP function for a Step Functions task to the default template.

Prerequisites

- Node 22.19 or later
- A package manager (npm/pnpm/yarn/bun)

Steps

1. Create a fresh directory and initialize the template:
   ```bash
   mkdir smoz-rest-step && cd smoz-rest-step
   npx -p @karmaniverous/get-dotenv@^8.0.0 -p @karmaniverous/smoz smoz init --yes
   ```
2. Add a Step Functions task function:
   ```bash
   npx smoz add step/greet
   ```
   This creates `app/functions/step/greet/lambda.ts` (with `eventType: 'step'`) and `handler.ts`.
3. Validate the task input. Step Functions' Lambda integration wraps the state input under `Payload`. In `lambda.ts`:
   ```ts
   export const eventSchema = z.object({
     Payload: z.object({ name: z.string() }),
   });
   export const responseSchema = z.object({ greeting: z.string() });
   ```
   And in `handler.ts`:
   ```ts
   export const handler = fn.handler(async (event) => {
     await Promise.resolve();
     return { greeting: `Hello, ${event.Payload.name}!` };
   });
   ```
   `event.Payload.name` is typed `string`. Input that fails the schema throws `Invalid event`, which fails the task; the state machine's `Retry` and `Catch` decide what happens next.
4. Generate registers, then typecheck:
   ```bash
   npx smoz register
   npm run typecheck
   ```
5. Wire the function into your state machine (for example with `serverless-step-functions`) and package:
   ```bash
   npm run package
   ```
   Serverless Framework v4 asks you to log in (or set `SERVERLESS_ACCESS_KEY`) first.

See also

- [Step Functions function](../../docs-src/recipes/step.md)
- [Validation and the handler event](../../docs-src/recipes/validation.md)
