# SMOZ App Template

This template provides a minimal, convention‑friendly baseline for new SMOZ apps:

- TypeScript configuration (strict, moduleResolution bundler)
- ESLint (flat config) + typescript‑eslint + Prettier, with the smoz rule `no-cross-function-imports`
- Vitest baseline config
- knip (dead code and unused dependencies)
- TypeDoc baseline config

## Conventions

- Author code lives under:
  - `app/config/app.config.ts` — app schemas/config (params, env, http tokens)
  - `app/functions/<eventType>/...` (e.g., `app/functions/rest/hello/get`)
- Generated artifacts live under:
  - `app/generated/`
    - `register.functions.ts` — side‑effect imports of all `lambda.ts`
    - `register.openapi.ts` — side‑effect imports of all `openapi.ts`
    - `register.serverless.ts` — side‑effect imports of per‑function `serverless.ts` (if any)
    - `openapi.json` — OpenAPI document

## Getting started

1. Install dependencies: `npm install`
2. Run every check: `npm run verify`

`verify` runs, in order: `smoz register`, `typecheck`, `lint`, `format` (Prettier check), `knip`, `test`, then `package`. Each also runs on its own (`npm run lint:fix` and `npm run format:fix` fix what they can).

`npm run package` generates `app/generated/openapi.json` (`smoz openapi`), then runs `serverless package`. Packaging loads every `lambda.ts` the way a deploy does, so it catches a top-level `await` or a module that needs live infrastructure at load. Serverless Framework v4 asks for a login even to package: run `npx serverless login` locally, and set `SERVERLESS_ACCESS_KEY` in CI.

## Project structure rules

- A function never imports another function's modules (`lambda.ts`, `handler.ts`, ...). Shared code goes in a module outside `app/functions`. `npm run lint` enforces this (`smoz/no-cross-function-imports`).
- Every `lambda.ts`, and what it imports, must load at build time: no top-level `await`, no connections or AWS calls at module level. `npm run package` catches this.

See [Project structure rules](https://github.com/karmaniverous/smoz/blob/main/docs-src/recipes/project-structure.md).

## SMOZ CLI — register

The CLI scans `app/functions/**` for `lambda.ts`, `openapi.ts`, and optional `serverless.ts` and generates side‑effect registration files under `app/generated/`.

- Build CLI (if packaged locally): `npm run cli:build`
- Register: `npx smoz register`
  - Idempotent: rewrites files only when content changes
  - Formats output with this project's Prettier and its config

Tip: Commit `app/generated/register.*.ts` so typecheck is stable without running the CLI. Teams often keep `app/generated/openapi.json` untracked in VCS (optional).

## Notes

- HTTP tokens (`rest`, `http`) are configured in your `app.config.ts`. You may widen these tokens per app.
- Keep function modules small and focused:
  - `lambda.ts`: define and register function (`app.defineFunction`)
  - `handler.ts`: business handler exported via `fn.handler`
  - `openapi.ts`: attach OpenAPI operation via `fn.openapi`
  - `serverless.ts`: (non‑HTTP only) attach extra events via `fn.serverless`

## Next steps

- Add your first endpoint (e.g., `app/functions/rest/hello/get`)
- Run the CLI register step
- Generate OpenAPI
- Package or deploy with your preferred toolchain

## Params used by serverless.ts

This template references a few params from your app config:

- Global params (app/config/app.config.ts → global.params)
  - `ESB_MINIFY` (boolean) — controls `build.esbuild.minify`
  - `ESB_SOURCEMAP` (boolean) — controls `build.esbuild.sourcemap`
  - `PROFILE`, `REGION`, `SERVICE_NAME`
- Stage params (app/config/app.config.ts → stage.params.<stage>)
  - `DOMAIN_NAME` — used by the custom domain plugin config
  - `DOMAIN_CERTIFICATE_ARN` — ACM certificate ARN for the domain
  - `STAGE`
  - `STAGE_NAME` — seeded as `${SERVICE_NAME}-${STAGE}` (not consumed yet)

Where these are used:

- The esbuild block in `serverless.ts` reads `ESB_MINIFY` and `ESB_SOURCEMAP`
  to toggle minification and sourcemaps.
- The `customDomain` section in `serverless.ts` reads `DOMAIN_NAME` and
  `DOMAIN_CERTIFICATE_ARN`. Update these with your values or remove the
  custom domain plugin if not needed.

## Path hygiene (cross‑platform)

Windows uses backslashes in paths, which can leak into string comparisons and generated artifacts. Normalize separators consistently using the helper exported by the toolkit:

```ts
import { toPosixPath } from '@karmaniverous/smoz';

// Derive the app root as the parent directory of app/config/
import { fileURLToPath } from 'node:url';
export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);
```
