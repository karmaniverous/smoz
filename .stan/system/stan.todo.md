# Development Plan

When updated: 2026-01-04T00:00:00Z

## Next up (near‑term, actionable)

- HTTP context propagation + hybrid context resolvers (NEW)
  - Requirements (already agreed; see stan.requirements.md):
    - For HTTP invocations, handler options must include:
      - `httpContext: HttpContext` (invoked route context token)
      - `resolvedContext?: ...` (resolver output, optional per context)
    - Context resolver execution depends on invoked route context (path prefix) only.
    - Serverless route surface must match OpenAPI route surface (context path prefixes and param normalization).
  - Config surface (App.create)
    - Add `contextResolvers?: ...` as a “hybrid” structure:
      - For HTTP event tokens (e.g., rest/http):
        - per-event-type map of per-HttpContext resolvers
      - For non-HTTP tokens:
        - a single resolver per event type
    - Ensure resolver typing flows into handler options:
      - For multi-context endpoints, accept a discriminated union on `options.httpContext`.
      - `resolvedContext` is optional/undefined when no resolver is configured for that context.
  - Runtime behavior (wrapHandler)
    - Rename existing `HandlerOptions.securityContext` → `HandlerOptions.httpContext` (or introduce and deprecate/remove old key).
    - Introduce `HandlerOptions.resolvedContext?: ...`.
    - Implement HTTP `httpContext` detection by path prefix only:
      - first segment `my`/`private` => that context; else `public`
    - Run the resolver (if configured) after `zod-before` (when schemas present) and before business handler.
    - Ensure HEAD short-circuit skips resolver execution (because handler is skipped).
    - Ensure resolver errors flow through the existing HTTP error stack (no special casing).
  - Serverless/OpenAPI sync fix (required before resolver work is meaningful)
    - Update Serverless builder so HTTP events:
      - use context-prefixed paths for non-public contexts (same builder as OpenAPI)
      - merge `serverless.httpContextEventMap[context]` fragment into each `http` event
    - Verify inline server routes (built from Serverless functions) now match OpenAPI and support context prefix routing.
  - Tests (must add/adjust)
    - Serverless builder unit tests:
      - ensure distinct paths for public/private/my for the same basePath
      - ensure context event fragments are merged (authorizer/private flags) per context
    - Runtime wrapper tests:
      - `httpContext` is set correctly for:
        - `/users` => public
        - `/my/users` => my
        - `/private/users` => private
      - resolver invoked only for configured contexts and only on non-HEAD
      - resolver output appears on `options.resolvedContext`
      - when resolver throws, HTTP response is shaped by existing error middleware
    - Type-level tests:
      - discriminated union narrows `resolvedContext` by `options.httpContext`
      - resolvedContext is optional when no resolver configured for that context
  - Docs
    - Add/extend a recipe documenting “context resolvers”:
      - show extracting claims + fetching user for `my` using eventType-specific resolver
      - show handler narrowing on `options.httpContext`
      - explicitly note reserved `my`/`private` first path segment rule

- Validate Serverless v4 plugin loading under ESM-only exports
  - Confirm Serverless can load `@karmaniverous/smoz/serverless-plugin` when it resolves to ESM.
  - If Serverless still requires CJS, decide whether to ship a minimal `.cjs` shim as an explicit exception and document the constraint.

- Align to upstream by‑token typing end state (entity‑manager v8 / client v1)
  - Dependencies:
    - Switch devDependencies to stable ranges once released:
      - @karmaniverous/entity-manager ^8.0.0
      - @karmaniverous/entity-client-dynamodb ^1.0.0
    - Track in CHANGELOG; remove prerelease ranges.
  - Code & templates:
    - Replace any lingering legacy type names with by‑token family:
      - EntityItem / EntityItemPartial, EntityRecord / EntityRecordPartial.
    - Ensure /app GET /users remains a non‑projection enrich → domain path
      (no attributes passed to getItems) so strict types flow without casts.
    - If any template demonstrates projection, keep it explicitly partial and
      document re‑enrichment for strict responses.
  - Tests (compile‑time):
    - Add a ts‑only test that encodes:
      1. Non‑projection: query → keys → getItems → removeKeys assignable to
         z.array(userSchema) (no casts).
      2. Projection: getItems with attributes as const remains partial and is
         not assignable to strict domain.
  - Docs:
    - Update docs and snippets to use by‑token names and clarify projection ergonomics.

- Plugin integration validation in SMOZ
  - (continues; no change)
  - Verify SMOZ wires the DynamoDB plugin (already included) under `aws` and exposes local subcommands:
    - `smoz aws dynamodb local start|stop|status`
    - Config-first behavior with native get-dotenv env interpolation ($DYNAMODB_LOCAL_ENDPOINT / $DYNAMODB_LOCAL_PORT)
    - Embedded fallback via @karmaniverous/dynamodb-local when present

- Tests
  - Ensure Local endpoint switching works when `DYNAMODB_LOCAL_ENDPOINT` is present (mock or integration)
  - Keep template typecheck and lint scripts green

- Docs (SMOZ)
  - Cross-link to DynamoDB plugin docs for Local orchestration (config-first vs embedded fallback) if/when published

- Template extraction (later)
  - Defer `templates/dynamodb` until the /app fixture is feature-complete.
  - Keep DynamoDB examples and parity work in /app until then.

## Completed

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- Requirements: define CLI composition under get-dotenv v6.2.x
  - Root-mounted SMOZ command plugins (no `smoz smoz ...`)
  - Only get-dotenv init grouped under `getdotenv` and configured to avoid templates
  - Keep cmd/batch/aws at root, omit whoami, nest dynamodb under aws

- Amendment: Drop get-dotenv init plugin from SMOZ requirements; `smoz init`
  owns get-dotenv scaffolding and always writes `getdotenv.config.ts` plus
  `getdotenv.dynamic.ts` (get-dotenv env == SMOZ stage). Add downstream `--cli`
  option to scaffold root `cli.ts` and a `tsx` script.

- CLI: migrate bootstrap to get-dotenv createCli and remove SMOZ JSON-only
  parsing of getdotenv config (stage inference now uses env/app.stages; env
  seeding reads params from app.stages with stage overrides for global keys).

- CLI: refactor SMOZ commands into root-mounted get-dotenv plugins
  (init/add/register/openapi/dev) and add useSmozPlugins installer.

- CLI: add missing smoz dev plugin module to fix typecheck/lint.

- CLI: update createCli branding and useSmozPlugins typing for get-dotenv v6.2.4.

- Tests: increase inline server startup timeout and fail fast on spawn errors.

- CLI: make useSmozPlugins structurally typed to avoid nominal mismatches.

- Lint: remove unnecessary String() conversion in inline server test.

- Docs: record owned-deps no-web-search policy in stan.project.md.

- Plan: prune completed items from “Next up”.

- CLI: mount aws/dynamodb plugin (entity-client-dynamodb) under `smoz aws`.

- Init: always seed get-dotenv config + dynamic, and add optional `--cli`
  local cli.ts scaffolding plus a `cli` script.
- Tests: add /app EntityClient env resolver coverage and a compile-time
  by-token inference guard (strict non-projection; partial projection).

- Tests: add CLI help coverage for aws/dynamodb local commands.

- Tests: fix aws/dynamodb help test invocation (argv).

- Tests: make aws/dynamodb help test deterministic (no dist).

- Tests: extend aws/dynamodb help test timeout and diagnostics.

- Verification: vitest run passes on Windows; aws/dynamodb help integration test
  completes within the per-test/spawn timeouts and emits actionable diagnostics.

- Docs: document `smoz aws dynamodb local` usage and link to get-dotenv docs.

- Docs: describe versioned DynamoDB naming (STAGE*NAME/TABLE*\*VERSION) and
  clarify the default “Serverless deploy creates tables” workflow.

- Docs: add troubleshooting note on by-token entity typing (strict vs projected)
  and the “re-enrich for strict responses” rule of thumb.

- Templates: add initial templates/dynamodb scaffold (tsconfigs + manifest merge,
  serverless import of Table000, App/OpenAPI wiring, EntityManager v000, and an
  /openapi endpoint with a placeholder app/generated/openapi.json).

- Templates: add first dynamodb template endpoint slice
  - Add GET /users (search) under templates/dynamodb with the same schema
    surface as the /app fixture (query params + { items, pageKeyMap } response).
  - Fix /app OpenAPI path param names for /users/{userId} routes.

- Amendment: remove templates/dynamodb from the repo for now and defer the
  DynamoDB template implementation until the /app fixture reaches the desired
  functional baseline.

- Build: switch SMOZ dist to ESM-only and de-orphan CLI exports
  - Publish ESM-only `dist/*.js` entrypoints and move the executable to `dist/bin/smoz.js`.
  - Remove `src/cli/public.ts` and make `src/cli/index.ts` the `@karmaniverous/smoz/cli` surface.