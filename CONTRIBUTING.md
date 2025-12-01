---
title: Contributing
---

# Contributing to SMOZ

Thanks for your interest in contributing! Please open an issue for design discussions before large changes.

## Environment

- Node 22.x (Lambda parity).
- Install dependencies with your preferred package manager; scripts assume npm.
- One-time setup: build local types so editors resolve path aliases:
  ```bash
  npm run build
  ```

## Workflow

The following commands will run all necessary checks and build steps:

```bash
npm i
npm run build
npx smoz register
npm run openapi
npm run lint:fix
npm run typecheck
npm test
```

## Lint and Format

This repository uses ESLint to drive Prettier for consistent formatting.

- The configuration enables the `prettier/prettier: 'error'` rule.
- Run `npm run lint:fix` to format code and automatically fix all lintable issues.
- Import sorting is enforced via `eslint-plugin-simple-import-sort`.

## Templates

- A single, unified ESLint configuration covers all templates.
- A script handles typechecking for all templates by discovering `templates/*/tsconfig.json` and running `tsc -p --noEmit`.
- To add a new template, simply create a new directory under `templates/` with a `tsconfig.json` file.

## Registers and OpenAPI

To regenerate side-effect registers and the OpenAPI specification, run:

```bash
npx smoz register
npm run openapi
```

It is recommended to commit `app/generated/register.*.ts` to ensure typechecking stability in CI environments. `openapi.json` may be left untracked.

## Path Hygiene

Always normalize path separators to ensure cross-platform compatibility, especially when deriving paths from `import.meta.url`.

```ts
import { fileURLToPath } from 'node:url';
import { toPosixPath } from '@karmaniverous/smoz';

export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);
```

## Middleware Invariants (HTTP)

The HTTP middleware stack follows a strict order to ensure correctness:

- `HEAD` requests are short-circuited first.
- The `serializer` runs last.
- `shape` must precede `serializer`.
- Validation runs `before` and `after` the handler if schemas are provided.

See the middleware documentation for more details on customization and invariants.

## Optional Pre-commit Hook (lefthook)

If you use `lefthook`, you can add a pre-commit hook to automatically refresh registers when endpoint files change. This is an optional enhancement.

Add this to your `lefthook.yml`:

```yaml
pre-commit:
  scripts:
    smoz-register:
      runner: bash
      script: |
        # If staged changes include app/functions/**/*.{ts,tsx}, refresh registers
        if git diff --cached --name-only | grep -E '^app/functions/.*\.(ts|tsx)$' >/dev/null; then
          npx smoz register
          git add app/generated/register.functions.ts \
                  app/generated/register.openapi.ts \
                  app/generated/register.serverless.ts
        fi
```
