---
title: Per-function Lambda config
sidebar_label: Lambda config
---

# Per-function Lambda config

Set Serverless Framework function properties (memory, timeout, tenant isolation, container images, layers and so on) on a single function with `serverless` in `defineFunction`. The type is `FunctionServerlessConfig`: the Serverless function definition from `@serverless/typescript`, minus the keys SMOZ owns.

## Memory and timeout

```ts
// app/functions/rest/reports/post/lambda.ts
export const fn = app.defineFunction({
  serverless: { memorySize: 1024, timeout: 60 },
  callerModuleUrl: import.meta.url,
});
```

Properties set here override the `provider` values in your top-level `serverless.ts` for this function only.

For values most functions share, set them once with `functionDefaults.serverless`. A function's own `serverless` is merged over it key by key:

```ts
export const app = App.create({
  // ...
  functionDefaults: {
    serverless: { memorySize: 512, timeout: 10 },
  },
});

// memorySize 512 (default), timeout 30 (own)
export const fn = app.defineFunction({
  serverless: { timeout: 30 },
  callerModuleUrl: import.meta.url,
});
```

## Tenant isolation

```ts
export const fn = app.defineFunction({
  serverless: { tenancy: { mode: 'PER_TENANT' } },
  callerModuleUrl: import.meta.url,
});
```

Serverless compiles `tenancy` to the Lambda `TenancyConfig` (`TenantIsolationMode`). It needs a Serverless Framework v4 release that supports `tenancy`.

## Container image

Serverless rejects a function with both `handler` and `image`, so when `image` is set SMOZ leaves out `handler`.

Give the image as an object, and SMOZ sets `image.command` to the handler it derives (e.g. `app/functions/rest/render/post/handler.handler`), so the container runs your SMOZ handler:

```ts
export const fn = app.defineFunction({
  serverless: {
    image: { uri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/render:1.4.0' },
    memorySize: 2048,
  },
  callerModuleUrl: import.meta.url,
});
```

Set `image.command` yourself to override it. With a string `image` (a URI or the name of an image in `provider.ecr.images`), SMOZ changes nothing, so the image's `CMD` must point at the handler.

`smoz dev` (inline) serves image functions from `image.command[0]` when that is a handler module in your project. It skips other image functions, including string images, with a notice.

## What SMOZ owns

`handler`, `events` and `environment` aren't accepted here, and SMOZ's values always win:

- `handler` derives from the file's location (`defaultHandlerFileName` / `defaultHandlerFileExport`).
- `events` come from the HTTP config, or from `fn.serverless(extras)` for non-HTTP functions (see [SQS function](./sqs.md)).
- `environment` comes from the app's env keys and the function's `fnEnvKeys` (see [Per-function env](./per-function-env.md)).
