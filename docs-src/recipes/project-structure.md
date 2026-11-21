---
title: Project structure rules
sidebar_label: Project structure rules
---

# Project structure rules

Two rules keep a smoz app deployable. Both come from how Serverless builds it, so unit tests, which import modules from source, can't catch a break. The template checks both: `npm run lint` checks the first, `npm run verify` both.

## 1. A function never imports another function's modules

Each function's `lambda.ts` calls `app.defineFunction` with `callerModuleUrl: import.meta.url`, and smoz derives the function's event type, endpoints root and name from that path. Bundled into another function, the imported `lambda.ts` (or a `handler.ts` that imports it) sees the **importer's** `import.meta.url`, so smoz derives its options from the wrong folder. A function that relies on derivation registers under the wrong event type and name; one that sets `eventType` with a `functionDefaults.functionName` style throws at cold start:

```
defineFunction: cannot apply functionDefaults.functionName for /var/task/app/functions/cognito-userpool/customMessage: it is not under /var/task/app/functions/rest. Pass functionName explicitly. In a deployed bundle, the usual cause is another function importing this function's lambda.ts or handler.ts: ...
```

Logic two functions share belongs in an app module outside `app/functions` (e.g. `app/domain/user.ts`), which both import.

### The ESLint rule

smoz ships the check as an ESLint rule, `smoz/no-cross-function-imports`, from `@karmaniverous/smoz/eslint`. The template turns it on:

```ts
// eslint.config.ts
import smoz from '@karmaniverous/smoz/eslint';

export default defineConfig(
  // ...
  {
    files: ['app/functions/**/*.ts'],
    ignores: ['**/*.test.ts'],
    plugins: { smoz },
    rules: { 'smoz/no-cross-function-imports': 'error' },
  },
);
```

A file belongs to the function whose folder is its nearest ancestor holding a `lambda.ts`. The rule resolves each import to a file and flags one that lands in a different function's folder, whether by relative path, path alias, re-export or dynamic `import()`. It never flags:

- a function's own modules, by any path (`./lambda`, `../lambda`, `@/app/functions/rest/users/get/lambda`);
- packages and app modules outside `app/functions`;
- type-only imports (`import type`), which the build erases.

The template's `@/` alias resolves to the package root (the nearest `package.json`). For other aliases, pass them, relative to the package root:

```ts
rules: {
  'smoz/no-cross-function-imports': ['error', { alias: { '~/': 'app' } }],
},
```

## 2. Every `lambda.ts` loads at build time

Serverless compiles `serverless.ts` to CommonJS and runs it, which loads every `lambda.ts` and everything they import. So that module graph must:

- **avoid top-level `await`.** CommonJS can't run it; packaging fails with `Top-level await is currently not supported with the "cjs" output format`. Await inside the handler, or in an initialisation function the handler calls.
- **do no work on load that needs a deployed environment:** no database connections, AWS calls or secret fetches at module level. Keep those in `handler.ts` (or modules only it imports), which runs only at invocation.

`lambda.ts` should import only schemas, the app and config. Business logic goes in `handler.ts`.

`npm run print` (`serverless print`) resolves the config the same way, so it fails on either problem, naming the module, without building a package (`npm run package` would too). `npm run verify` runs it; run it in CI.

Serverless Framework v4 asks for a login even to print: in CI, set `SERVERLESS_ACCESS_KEY`.

See also: [Troubleshooting](./troubleshooting.md).
