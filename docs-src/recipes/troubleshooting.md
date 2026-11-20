---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting

## Registers (module not found)

Symptoms:

- `Cannot find module '@/app/generated/register.*'`

Fix:

```bash
npx smoz register
```

Tip: Commit the generated `register.*.ts` to keep typecheck stable. The Serverless plugin (exported as `@karmaniverous/smoz/serverless-plugin`) runs `smoz register` before package/deploy.

## Windows TypeScript path issues

- Normalize separators when deriving paths:

```ts
import { fileURLToPath } from 'node:url';
import { toPosixPath } from '@karmaniverous/smoz';
export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);
```

## `cannot derive eventType` at cold start

Symptoms:

- A deployed function fails at cold start with `defineFunction: cannot derive eventType for /var/task/...`, while `smoz dev` works.

Fix:

- Upgrade SMOZ: 0.4.0 measured the path against `appRootAbs`, which points inside the bundle once esbuild inlines `app.config.ts`. Later versions derive from the function file's own location; see [Bundled or not, the same result](../overview.md#bundled-or-not-the-same-result).
- If it persists, check that the file is under `functions/<eventType>/` with `<eventType>` a key of `eventTypeMapSchema`, or pass `eventType` explicitly.

## serverless‑offline loops or stale artifacts

- Ensure registers are fresh (`npx smoz register`).
- Clear caches/build output if necessary:

```bash
rimraf .tsbuild .rollup.cache dist
```

## Validation 400s and 500s

- The HTTP stack answers an event that fails `eventSchema` with `400 Invalid event`: check the request against the schema.
- It answers a handler result that fails `responseSchema` with `500 Invalid response`: the handler returned something the schema rejects. The Zod issues are in the function's logs.
- Non-HTTP functions (SQS, Step Functions, Cognito, ...) validate too: an invalid event throws `Invalid event` before the handler, an invalid response throws `Invalid response` after it. The error carries the Zod `issues`. See [Validation and the handler event](./validation.md).

## HEAD routes

- Do not duplicate HEAD; the HTTP stack short‑circuits HEAD to `200 {}` and sets the configured content type.
