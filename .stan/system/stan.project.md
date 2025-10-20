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
