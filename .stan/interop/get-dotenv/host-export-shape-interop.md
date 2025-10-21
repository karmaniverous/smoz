# Interop — get‑dotenv host export surface and detection probes

When: 2025-10-20

Context
- The SMOZ CLI is now host‑only and delegates all commands to
  @karmaniverous/get-dotenv.
- Our CLI explores multiple host entry shapes to remain resilient across
  packaging/interop variants, but a missing probe caused hard failures in
  pre‑steps like “register” (e.g., typecheck/openapi/package scripts).

Observed failure (downstream)
- Error: “get-dotenv host is not available or did not expose a known entry
  point (probed: createCli, runCli, run, default function, default.run,
  cli.run)”.
- Root cause: our detection does not probe the “default.createCli().run”
  variant (common when bundlers place createCli on the default export).

Goals
1) Stabilize a minimal, canonical host export contract in get‑dotenv that works
   across ESM/CJS import styles without shape‑probing guesswork.
2) Keep backward compatibility for a transition window so existing downstreams
   keep working.
3) Reduce the surface area we need to probe in SMOZ and other clients.

Recommended canonical contract (get‑dotenv)
- Mandatory named export:
  - createCli(options?: { branding?: string }): { run(argv: string[]): Promise<void> }
- Optional helpers (for convenience, not required):
  - runCli({ argv, branding? }): Promise<void>
  - default (function): default({ argv, branding? }): Promise<void> that
    delegates to createCli(opts).run(argv)
  - default object: default.createCli(opts).run(argv) (kept for backward
    compatibility)

ESM expectations
- import { createCli } from '@karmaniverous/get-dotenv'
- import getDotenv from '@karmaniverous/get-dotenv'
  - getDotenv.createCli?.(...).run(...)
  - or getDotenv({ argv, branding }) as a convenience default function

CJS expectations
- const g = require('@karmaniverous/get-dotenv')
  - g.createCli?.(...).run(...)
  - g.default?.createCli?.(...).run(...)
  - g.default?.({ argv, branding }) as a convenience default function

Exports map (package.json)
- Ensure the exports map exposes both ESM and CJS consumers consistently:
  - "exports": {
      ".": {
        "import": "./dist/mjs/index.js",
        "require": "./dist/cjs/index.js"
      },
      "./package.json": "./package.json"
    }
- The ESM/CJS entry modules should each provide:
  - named export createCli
  - optional named runCli
  - default export that either:
    - is a function delegating to createCli(opts).run(argv), or
    - is an object with createCli (legacy compatibility).
- TypeScript types should include named createCli and reflect the default
  export’s callable/object shape as applicable.

Why this contract
- Downstream adapts cleanly to “canonical named entry” (createCli) and can fall
  back to default() or default.createCli() for older builds without extensive
  probing logic.
- Maintains interop across static ESM imports, dynamic imports, and CJS require.
- Encourages a single, predictable host creation path while tolerating legacy
  default object/function variants.

Downstream (SMOZ) current probe set
- Preferred (host path): createCli().run
- Adapter fallback probes (dynamic import):
  - runCli({ argv, branding? })
  - run({ argv, branding? })
  - default (function) → default({ argv, branding? })
  - default.run({ argv, branding? })
  - cli.run({ argv, branding? })
- Missing today (causing failures if dist exposes it): default.createCli().run

Immediate unblock proposal (downstream)
- Extend both preferred and adapter paths to also probe:
  - default.createCli(opts).run(argv)
- Optionally, probe default.cli.run(opts) as a belt‑and‑suspenders fallback if
  we expect some packagers to place the CLI object under default.cli.

Recommended get‑dotenv work (upstream hardening)
1) Publish consistent ESM/CJS entries where a named createCli is always
   available. Keep default() as a convenience delegate:
   - ESM:
     - export function createCli(...) { ... }
     - export default (opts) => createCli(opts)
   - CJS:
     - module.exports.createCli = createCli
     - module.exports.default = (opts) => createCli(opts)
     - Optionally also module.exports.default = { createCli }, for legacy
       compatibility where the default export has been an object.
2) Ensure the TypeScript declaration file includes named createCli and the
   default’s callable type (if you keep the function form) or object shape.
3) Add a small interop test matrix inside get‑dotenv CI:
   - Static ESM import: `import { createCli } ...; createCli(...).run(...)`
   - Dynamic import (ESM): `(await import(...)).createCli(...).run(...)`
   - CJS require: `require(...).createCli(...).run(...)`
   - Optional: default() and default.createCli() paths (legacy)
4) Document the canonical entry and deprecation plan for non‑canonical shapes:
   - Recommended usage: `createCli({...}).run(argv)`.
   - Default function and default object variants may remain for compatibility,
     but new consumers should prefer the named export.

Compatibility & SemVer
- Introduce/guarantee the named export createCli under a minor release.
- Keep default() or default.createCli() working during a grace period; mark as
  “legacy” in docs to steer consumers to the named export.
- If removing legacy shapes in the future, reserve a major bump.

Diagnostics and developer experience
- SMOZ will enhance error messages in verbose mode to print the found keys and
  clarify which shapes were probed, but we prefer to minimize shape‑probing by
  settling on createCli as canonical.
- Clear docs/tips for typical integrations:
  ```ts
  import { createCli } from '@karmaniverous/get-dotenv';
  await createCli({ branding: 'mytool vX.Y.Z' }).run(process.argv.slice(2));
  ```

Acceptance criteria (joint)
Upstream (get‑dotenv)
- Named `createCli` present across ESM/CJS entries and types.
- Default export remains callable (or exposes `.createCli`) for legacy consumers.
- Docs updated to recommend the named export; legacy variants documented as
  supported but non‑canonical.
- Interop test matrix covers ESM static/dynamic and CJS require.

Downstream (SMOZ)
- Add probe for `default.createCli(...).run(...)` in both host/index and
  util/getdotenvHost (adapter).
- Unit tests added to exercise the default.createCli path.
- All impacted scripts (typecheck, openapi, package) pass locally and in CI.

Notes
- This interop note captures the friction point and preferred steady‑state.
  We’ll file/coordinate an upstream work item to stabilize the export surface,
  while making a minimal downstream change to restore green immediately.
