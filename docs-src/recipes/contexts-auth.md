---
title: Contexts + Cognito authorizer
sidebar_label: Contexts + Cognito
---

# Contexts + Cognito authorizer

Declare security contexts in `app.config.ts` and select them per endpoint.

## App config

```ts
export const app = App.create({
  // ...
  serverless: {
    httpContextEventMap: {
      my: {
        authorizer: {
          arn: '${param:COGNITO_USER_POOL_ARN}',
          name: 'UserPoolAuthorizer',
          type: 'COGNITO_USER_POOLS',
        },
      },
      private: { private: true },
      public: {},
    },
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
  },
});
```

## Endpoint selection

```ts
// app/functions/rest/users/get/lambda.ts
export const fn = app.defineFunction({
  eventType: 'rest',
  httpContexts: ['public', 'my'], // publish on both public and "my"
  callerModuleUrl: import.meta.url,
});
```

To give every function the same contexts, set them once in `App.create({ functionDefaults: { httpContexts: ['my', 'private'] } })`; a function's own `httpContexts` still wins.

At build time:

- The registry emits an HTTP event per context (path prefix for non‑public).
- The “my” context also includes your Cognito authorizer fragment.
