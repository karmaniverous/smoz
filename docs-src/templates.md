---
title: Templates
sidebar_label: Templates
sidebar_position: 4
---

# Templates

The package ships one app template, `default`.

## Layout

- templates/default — a small app, with its tooling (tsconfig, ESLint, Prettier, Vitest, knip, TypeDoc):
  - app/config/app.config.ts
  - app/functions/rest/hello/get/{lambda,handler,openapi}.ts
  - app/functions/rest/openapi/get/{lambda,handler,openapi}.ts
  - serverless.ts
  - app/config/openapi.ts

## Register files (generated)

SMOZ keeps side‑effect registers in `app/generated/`:

- register.functions.ts — imports all `lambda.ts`
- register.openapi.ts — imports all `openapi.ts`
- register.serverless.ts — imports all per‑function `serverless.ts` (non‑HTTP)

Generate/update:

```bash
npx smoz register
```

### Template register imports (TypeScript)

Templates do not commit generated files under `app/generated/` (including `register.*.ts`). Instead, each template ships an ambient declarations file that declares the three register modules so TypeScript can typecheck without artifacts:

- `@/app/generated/register.functions`
- `@/app/generated/register.openapi`
- `@/app/generated/register.serverless`

For the default template this file is: `templates/default/types/registers.d.ts`.

When a template needs to ensure register side effects are evaluated at runtime (e.g., in `serverless.ts` or the OpenAPI builder), use a plain side-effect import. The ambient declaration lets it resolve under TypeScript’s `noUncheckedSideEffectImports` while still executing module side effects:

```ts
import '@/app/generated/register.functions';
```

In real apps, `smoz init` seeds empty placeholders in `app/generated/` and `smoz register` keeps them up to date. Teams often commit the generated `register.*.ts` files so CI typecheck remains stable.

## OpenAPI document

The template includes a script to build `app/generated/openapi.json`:

```bash
npm run openapi
```

It imports `register.openapi.ts`, collects paths, and writes the document.

## Path hygiene (cross‑platform)

Always normalize file system separators when deriving paths from `import.meta.url` or from Node helpers. Example:

```ts
import { fileURLToPath } from 'node:url';
import { toPosixPath } from '@karmaniverous/smoz';

export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);
```

## The app's checks

An app made from the template checks itself with one script:

```bash
npm run verify
```

It runs `smoz register`, `npm run openapi` (`smoz openapi`; the handler serving the document imports it, so typecheck needs it), typecheck, lint, format check, knip, tests, then `npm run print` (`serverless print`). Lint enforces `smoz/no-cross-function-imports`; `print` resolves the Serverless config, loading every `lambda.ts` the way a deploy does, without building a package. See [Project structure rules](./recipes/project-structure.md). Serverless Framework v4 needs a login even to print: in CI, set `SERVERLESS_ACCESS_KEY`.

## Lint & typecheck (in this repo)

- Lint, with the template's own ESLint config:
  ```bash
  npm run templates:lint      # check
  npm run templates:lint:fix  # fix
  ```
  The config imports `@karmaniverous/smoz/eslint`; the script links this package (built first) into the template for the run.
- Typecheck:
  ```bash
  npm run templates:typecheck
  ```
  Runs `tsc -p --noEmit` for each `templates/*/tsconfig.json`, and again on a copy with `smoz add` output.

## Authoring guidelines

- Keep endpoint modules small and focused:
  - lambda.ts — define/register function
  - handler.ts — business handler
  - openapi.ts — call `fn.openapi`
  - serverless.ts (non‑HTTP only) — call `fn.serverless(extras)`
- Do not duplicate HEAD routes; the HTTP stack short‑circuits HEAD to 200 {}.
- Prefer clear routes; when you must alias, use small wrappers or redirects.

## Adding a new template

Create a new folder under `templates/*` with a `tsconfig.json` and an `eslint.config.ts`. `templates:typecheck` picks it up automatically; `templates:lint` currently lints `templates/default` only.

## Commit registers?

Yes—this can still be a good practice for downstream apps.

- If your CI/local scripts always run `smoz register` before typecheck/build/package, you don’t need to commit `app/generated/register.*.ts`.
- If you want typecheck/IDE and CI stability without relying on a prior CLI step, many teams commit `app/generated/register.*.ts`.
