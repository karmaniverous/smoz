# Example: REST only

The default template plus one endpoint with a path parameter.

Prerequisites

- Node 22.19 or later
- A package manager (npm/pnpm/yarn/bun)

Steps

1. Create a fresh directory and initialize the template:
   ```bash
   mkdir smoz-rest-only && cd smoz-rest-only
   npx -p @karmaniverous/get-dotenv@^8.0.0 -p @karmaniverous/smoz smoz init --yes
   ```
   The app already serves `GET /hello` and `GET /openapi`.
2. Add an endpoint with a path parameter:
   ```bash
   npx smoz add rest/users/:id/get
   ```
   This creates `app/functions/rest/users/[id]/get/{lambda,handler,openapi}.ts`, with `eventType: 'rest'` and `basePath: 'users/{id}'` in `lambda.ts`.
3. Validate the parameter. In `lambda.ts`:
   ```ts
   export const eventSchema = z.object({
     pathParameters: z.object({ id: z.string().min(1) }),
   });
   ```
   The handler's `event.pathParameters.id` is then a `string`, typed and at runtime.
4. Generate registers and OpenAPI, then typecheck:
   ```bash
   npx smoz register
   npm run openapi
   npm run typecheck
   ```
   This writes `app/generated/register.*.ts` and `app/generated/openapi.json`.
5. Run it locally:
   ```bash
   npx smoz dev -p 3000
   ```
   The inline server prints the routes; try `curl http://localhost:3000/users/42`.
6. Package with Serverless (no deploy):
   ```bash
   npm run package
   ```
   Serverless Framework v4 asks you to log in (or set `SERVERLESS_ACCESS_KEY`) first.

Troubleshooting

- "module not found" for `app/generated/register.*`: run `npx smoz register`.
- A request answered `400 Invalid event` failed `eventSchema`; a `500 Invalid response` means the handler's result failed `responseSchema`. See [Validation and the handler event](../../docs-src/recipes/validation.md).
