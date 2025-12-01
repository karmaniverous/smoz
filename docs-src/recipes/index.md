---
title: Recipes
children:
  - ./sqs.md
  - ./step.md
  - ./contexts-auth.md
  - ./custom-middleware.md
  - ./per-function-env.md
  - ./observability.md
  - ./troubleshooting.md
---

# Recipes

Concrete patterns you can lift into your app. Each recipe links to a focusedpage with short snippets.

- [SQS function](./sqs.md)
- [Step Functions function](./step.md)
- [Contexts + Cognito authorizer](./contexts-auth.md)
- [Custom middleware (insertAfter 'shape')](./custom-middleware.md)
- [Per‑function env (fnEnvKeys)](./per-function-env.md)
- [Observability (requestId header)](./observability.md)
- [Troubleshooting](./troubleshooting.md)

Tip: Keep endpoint modules small and focused:

```
lambda.ts       // define/register function
handler.ts      // business handler
openapi.ts      // attach OpenAPI operation
serverless.ts   // (non‑HTTP only) attach platform events
```
