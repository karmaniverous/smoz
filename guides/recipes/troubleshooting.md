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

## DynamoDB Local commands (CLI path)

If you’re looking for the DynamoDB Local lifecycle commands, they are nested under `aws`:

```bash
npx smoz aws dynamodb local --help
```

## Entity typing: strict vs projection (by-token)

If you’re using `@karmaniverous/entity-client-dynamodb` and `@karmaniverous/entity-manager`, the “by-token” typing model distinguishes:

- Strict (full) reads: `getItems(token, keys)` returns strict records; removing keys returns strict domain items.
- Projection reads: `getItems(token, keys, attributes as const)` returns projected/partial records; removing keys remains projected/partial.

Practical rule of thumb:

- If you need to return strict domain shapes (matching your Zod domain schema), avoid projections in the final fetch.
- If you do use projections for efficiency, re-enrich (fetch full records) before returning strict responses.

Example (strict, non-projection):

```ts
const token = 'user' as const;
const keys = entityClient.entityManager.getPrimaryKey(token, { userId: 'u1' });

const { items: records } = await entityClient.getItems(token, keys);
const items = entityClient.entityManager.removeKeys(token, records);
// items is strict domain shape for `token`
```

Example (projection stays partial):

```ts
const token = 'user' as const;
const keys = entityClient.entityManager.getPrimaryKey(token, { userId: 'u1' });

const { items: projected } = await entityClient.getItems(token, keys, [
  'userId',
] as const);
const items = entityClient.entityManager.removeKeys(token, projected);
// items is projected/partial (not assignable to strict domain without re-enrich)
```

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
