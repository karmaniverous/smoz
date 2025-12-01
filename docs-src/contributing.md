---
title: Contributing
---

# Contributing

## Environment

- Node 22.x (Lambda parity). Local tests on Vitest 3.2.4.
- Install with your preferred PM; scripts assume npm.
- One‑time: build local types so editors resolve path aliases across templates:
  ```bash
  npm run build
  ```

## Workflow

```bash
npm i
npm run build
npx smoz register
npm run openapi
npm run lint:fix
npm run templates:lint
npm run typecheck
npm run templates:typecheck
npm test
```

## Lint and format

This repo uses ESLint to drive Prettier formatting:

- Flat config enables the rule:
  ```
  'prettier/prettier': 'error'
  ```
- Use:
  ```bash
  npm run lint:fix
  npm run templates:lint
  ```
- Import sorting is enforced via `eslint-plugin-simple-import-sort`.

## Templates

- A unified ESLint config covers all templates (no per‑template edits).
- Typecheck is driven by a small script that finds `templates/*/tsconfig.json` and invokes `tsc -p --noEmit` per template.
- Adding a new template requires only adding a directory with a `tsconfig.json`.

## Registers and OpenAPI

```bash
npx smoz register
npm run openapi
```

Commit `app/generated/register.*.ts` to keep typecheck stable. `openapi.json` may remain untracked.

## Path hygiene

Normalize separators when deriving paths:

```ts
import { fileURLToPath } from 'node:url';
import { toPosixPath } from '@karmaniverous/smoz';

export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);
```

## Middleware invariants (HTTP)

Stable step IDs and transforms ensure correctness:

- HEAD short‑circuit first
- Serializer last
- Shape precedes serializer
- Validation before/after when schemas provided

See the middleware page for customization and invariants.

## Optional pre‑commit recipe (lefthook)

If your team uses lefthook, you can add an optional pre‑commit command to refresh registers when endpoint files change. This is not enforced by the toolkit and is safe to omit.

Example snippet (add to your `lefthook.yml`):

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

Keep this commented or opt‑in according to your team’s workflow.
