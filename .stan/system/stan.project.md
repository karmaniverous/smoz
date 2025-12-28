# Project Prompt — @karmaniverous/smoz (assistant instructions)

Purpose & scope

- This file augments the system prompt with project‑specific assistant
  instructions only. Durable product/engineering requirements live in
  `.stan/system/stan.requirements.md` and must not be duplicated here.
- When requirements evolve, update `stan.requirements.md`; keep this file
  focused on how to work in this repository.

How to work in this repo (assistant expectations)

- Documentation separation
  - Keep durable requirements in `stan.requirements.md`.
  - Keep assistant behavior/policy in this file.
  - When proposing code patches, also update `stan.todo.md` (Completed) and
    include a commit message (see system prompt cadence).

- Publishing, scope, and fixtures
  - The toolkit publishes only `dist/` and `templates/`. The `app/` tree is
    an integration fixture used by CI (register → OpenAPI → package). Never
    propose publishing `app/` or relying on it at runtime.

- Patching & size discipline
  - Apply the one‑patch‑per‑file rule and LF line endings.
  - Hard 300‑LOC pivot: if any file would exceed ~300 LOC, propose a
    decomposition plan first (modules, responsibilities, tests) before code.

- Paths and portability
  - Normalize all paths to POSIX separators in code, diffs, and generated
    artifacts. Prefer the provided helpers (`toPosixPath`, `dirFromHere`) and
    keep Windows portability in mind (e.g., no `:` in template directories).

- Templates and type safety
  - Templates must typecheck without generated registers; rely on the ambient
    `types/registers.d.ts` declarations and do not add app/generated artifacts
    into template sources. Keep the unified templates ESLint config and the
    template typecheck script working across all templates.
  - EntityManager type inference (directive): When SMOZ code interacts with
    @karmaniverous/entity-manager and @karmaniverous/entity-client-dynamodb,
    types must be inferred without local casts, ad‑hoc type aliases, or
    “type gymnastics”. If inference breaks, treat it as a code smell. Investigate
    and either fix locally by preserving literal config tokens (as const) or
    raise an interop note under .stan/interop/\* with a minimal repro and clear
    acceptance criteria. Do not ship local workarounds for broken inference.
  - Template extraction policy: Prove functionality and inference in the /app
    fixture first; extract a minimal, stable template only after the fixture is
    green. Avoid publishing unproven templates.

- Dev loop and local serving
  - Inline server: prefer tsx; if tsx is missing, instruct users to install it
    or use `--local offline` rather than coding around the absence.
  - Offline mode: restart only when the route surface changes (register write).
  - Seed process.env from app config during dev exactly as described in the
    requirements; do not invent additional seeding rules.

- get‑dotenv docs‑first policy
  - When any ambiguity or open question arises regarding get‑dotenv behavior,
    configuration, or capabilities, consult the official documentation FIRST:
    https://docs.karmanivero.us/get-dotenv
  - Before implementing any new CLI‑related functionality, search that
    documentation to validate whether the capability already exists in
    get‑dotenv (host, plugins, cmd/batch, AWS integration, config/validation/
    diagnostics, spawn‑env, stage resolution, etc.). Prefer using or extending
    the host and plugins over adding custom code in this repository.
  - Only after validating a true gap should new CLI behavior be implemented;
    record the rationale in the development plan.

- Owned dependency research policy (assistant)
  - Do not use web search for information about dependencies we own (e.g.,
    @karmaniverous/get-dotenv, @karmaniverous/entity-client-dynamodb,
    @karmaniverous/entity-manager).
  - If the imported STAN assistant guides and in-repo docs are insufficient for
    a failure mode, request the missing information (logs, versions, code
    excerpts, minimal repro) rather than guessing or searching.

- get‑dotenv ownership alert (new directive)
  - We own @karmaniverous/get-dotenv. When there appears to be an issue with
    get‑dotenv (API/export shape, types, packaging, runtime behavior), DO NOT
    engineer around it in this repo.
  - Raise an alert and author an interop note under
    .stan/interop/get-dotenv describing:
    1. symptoms and repro,
    2. root‑cause hypothesis,
    3. the best upstream outcome for smoz (API/exports/types/docs),
    4. acceptance criteria.
  - Coordinate resolution upstream; only then adjust this repo if needed.

- Owned-dependency information policy (new directive)
  - Do not use web search for dependencies we own (e.g., get-dotenv,
    entity-client-dynamodb, entity-manager).
  - Prefer in-repo docs and imported STAN assistant guides.
  - If those are insufficient to diagnose a failure mode, request the missing
    info explicitly (logs, code excerpts, versions, minimal repro).

- OpenAPI and contracts
  - OpenAPI is hand‑crafted; never reverse‑generate from Zod. When an endpoint
    changes, ensure its `openapi.ts` remains the source of truth and the
    aggregator composes paths correctly for contexts.

- Event tokens
  - Extend the event map via the app schema when necessary and keep the base
    tokens intact. If widening HTTP tokens, update tests and requirements
    accordingly (change requires requirements patch).

Pointers to requirements (read before changing related areas)

- Build/publish and dist alias policy — see stan.requirements.md §1.
- App/registry model — see §2.
- HTTP middleware order/behavior — see §3.
- Serverless/OpenAPI aggregators — see §4.
- get‑dotenv integration and CLI/host usage — see imported get‑dotenv requirements.
- CLI, dev loop, local modes — see §5.
- Serverless plugin (register freshness) — see §6.
- Templates (TS configs, ESLint, placeholders) — see §7.
- Init UX, conflicts/install, manifest merge — see §8.
- Routing & portability — see §9.
- Event/HTTP tokens (incl. Step) — see §10.
- Function env defaults — see §11.
- Types hygiene (aws‑lambda) — see §12.
- Lint/format & template scalability — see §13.
- Docs and Typedoc ordering — see §14.
- Integration fixture (/app) — see §15.
- Install guard — see §16.
- Logger shape — see §17.
- OpenAPI authoring — see §18.
- Testability of env config — see §19.

Operational reminders

- Do not edit `.stan/system/stan.system.md`; propose durable policy changes
  in this file or the requirements document as appropriate.
- Always include a commit message and keep `stan.todo.md` current with
  Completed entries for material changes (as required by the system prompt).

## STAN assistant guide — creation & upkeep policy

This repository SHOULD include a “STAN assistant guide” document at `guides/stan-assistant-guide.md` (or an equivalent single, stable path if your repo uses a different docs layout). This guide exists to let STAN assistants use and integrate the library effectively without consulting external type definition files or other project documentation.

Policy

- Creation (required):
  - If `guides/stan-assistant-guide.md` is missing, create it as part of the first change set where you would otherwise rely on it (e.g., when adding/altering public APIs, adapters, configuration, or key workflows).
  - Prefer creating it in the same turn as the first relevant code changes so it cannot drift from reality.
- Maintenance (required):
  - Treat the guide as a maintained artifact, not a one-off doc.
  - Whenever a change set materially affects how an assistant should use the library (public exports, configuration shape/semantics, runtime invariants, query contracts, paging tokens, projection behavior, adapter responsibilities, or common pitfalls), update the guide in the same change set.
  - When deprecating/renaming APIs or changing semantics, update the guide and include migration guidance (old → new), but keep it concise.
- Intent (what the guide must enable):
  - Provide a self-contained description of the “mental model” (runtime behavior and invariants) and the minimum working patterns (how to configure, how to call core entrypoints, how to integrate a provider/adapter).
  - Include only the information required to use the library correctly; omit narrative or historical context.
- Constraints (how to keep it effective and reusable):
  - Keep it compact: “as short as possible, but as long as necessary.”
  - Make it self-contained: do not require readers to import or open `.d.ts` files, TypeDoc pages, or other repo docs to understand core contracts.
  - Avoid duplicating durable requirements or the dev plan:
    - Requirements belong in `stan.requirements.md`.
    - Work tracking belongs in `stan.todo.md`.
    - The assistant guide should focus on usage contracts and integration.
  - Define any acronyms locally on first use within the guide (especially if used outside generic type parameters).
