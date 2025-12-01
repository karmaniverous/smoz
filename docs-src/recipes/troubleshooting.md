---
title: Troubleshooting
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

## serverless‑offline loops or stale artifacts

- Ensure registers are fresh (`npx smoz register`).
- Clear caches/build output if necessary:

```bash
rimraf .tsbuild .rollup.cache dist
```

## Validation 400s

- The HTTP stack maps Zod validation failures to 400. Check your `eventSchema` and `responseSchema`.

## HEAD routes

- Do not duplicate HEAD; the HTTP stack short‑circuits HEAD to `200 {}` and sets the configured content type.
