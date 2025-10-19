# Development Plan

When updated: 2025-10-16T00:00:00Z

## Next up (near‑term, actionable)

- No immediate items. Monitor dev UX and template lint/typecheck in CI.

## Completed (recent)

- Interop design note for getdotenv:
  - Added `.stan/interop/get-dotenv/smoz-cli-host-integration.md` capturing host+plugin
    integration, layered resolution with per‑layer interpolation, Zod validation,
    key aliasing, tracing/redaction/entropy, spawn env normalization, and SMOZ
    stage handling (removing STAGE from stage.params and deriving from stage precedence).
  - This note is the basis for interop negotiation with the getdotenv assistant prior
    to implementation across both repositories.

- Documentation partition & rationalization:
  - Extracted all durable product/engineering requirements from
    `.stan/system/stan.project.md` into a new `.stan/system/stan.requirements.md`.
  - Rewrote `stan.project.md` to contain only project‑specific assistant
    instructions and clear scope/separation notes.
  - No content lost; structure clarified to keep requirements separate from assistant policies.

- Follow‑up on App.create overloads (implementation placement):
  - Placed the `create()` implementation after both overload signatures (TypeScript
    requires overload signatures to precede the implementation). Keeps the “provided
    schema” signature first while satisfying TS2389 and preserving runtime behavior.

- Fix App.create overload selection with provided eventTypeMapSchema:
  - Reordered overloads so the “provided schema” signature appears first. Resolves
    TS2322 errors seen in apps/tests that extend `baseEventTypeMapSchema` and restores
    typecheck/build/docs green without changing runtime behavior.

- Inline dev (downstream fix) — entry selection:
  - Prefer the compiled dist entry (`dist/mjs/cli/inline-server.js`) when present and
    still run it under tsx so downstream TS files import cleanly; fall back to the TS
    entry only in the repo workspace. Added unit tests for entry selection to surface
    regressions early.

- Dev loop decomposition:
  - Introduced `src/cli/dev/index.ts` (orchestrator), `src/cli/dev/env.ts` (env
    helpers), and `src/cli/dev/inline.ts` (inline/tsx).
  - Updated the CLI entry to import from the new orchestrator and adjusted tests to
    the new module boundaries. Removed the old `src/cli/dev.ts`.
