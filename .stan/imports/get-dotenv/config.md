---
title: Config files and overlays
---

# Config files and overlays (always-on)

The config loader lets you specify environment values using JSON/YAML or JS/TS config files, then overlay them deterministically with privacy and source precedence.

Behavior: In the shipped CLI (plugin-first host) and the generator path, the loader/overlay pipeline is always active and is a no-op when no config files are present.

## Discovery order

When enabled, the loader discovers up to three configs in the following order:

1. Packaged root (the library’s own package root, “public” only)
   - `getdotenv.config.json`
   - `getdotenv.config.yaml` / `.yml`
   - `getdotenv.config.js` / `.mjs` / `.cjs`
   - `getdotenv.config.ts` / `.mts` / `.cts`
2. Project root (your repository)
   - Public:
     - `getdotenv.config.json`
     - `getdotenv.config.yaml` / `.yml`
     - `getdotenv.config.js` / `.mjs` / `.cjs`
     - `getdotenv.config.ts` / `.mts` / `.cts`
   - Local (private, gitignored conventionally):
     - `getdotenv.config.local.json`
     - `getdotenv.config.local.yaml` / `.yml`
     - `getdotenv.config.local.js` / `.mjs` / `.cjs`
     - `getdotenv.config.local.ts` / `.mts` / `.cts`

Notes:

- Packaged `.local` is not expected by policy and is ignored.
- The first matching “public” file per scope is used; the same for “local”.

## Formats

JSON/YAML (data only, always-on; no-op when no files are present):

- Allowed keys:
  - `dotenvToken?: string`
  - `privateToken?: string`
  - `paths?: string | string[]`
  - `loadProcess?: boolean`
  - `log?: boolean`
  - `shell?: string | boolean`
  - `scripts?: Record<string, unknown>`
  - `vars?: Record<string, string>` (global, public)
  - `envVars?: Record<string, Record<string, string>>` (per-env, public)
- Disallowed in JSON/YAML (this step): `dynamic` — use JS/TS instead.

JS/TS (data + dynamic):

- Accepts all JSON/YAML keys and also:
  - `dynamic?: GetDotenvDynamic` — a map where values are either strings or functions of the form `(vars: ProcessEnv, env?: string) => string | undefined`.

TS support:

- Direct import works if a TS loader is present.
- Otherwise, the loader auto-bundles via esbuild when available; if esbuild is not present, it falls back to a simple TypeScript transpile for single-file modules without imports.

## Privacy

Config privacy derives from the filename suffix:

- Public: `getdotenv.config.json` / `.yaml` / `.yml` (shared in VCS).
- Local: `getdotenv.config.local.json` / `.yaml` / `.yml` (gitignored).

## Overlays and precedence

The loader overlays config-provided values onto the “base” file-derived dotenv values using these axes (higher wins):

1. Kind: `dynamic` > `env` > `global`
2. Privacy: `local` > `public`
3. Source: `project` > `packaged` > `base`

The overlay flow:

1. Base: resolve file cascade using `getDotenv` (exclude dynamic; ignore programmatic `vars`).
2. Overlay config sources in order: packaged (public only) → project public → project local.
3. Apply dynamic in order: programmatic dynamic (if provided) → config dynamic from JS/TS (packaged → project public → project local) → file `dynamicPath` (lowest dynamic tier).
4. Optional effects: `outputPath` (write consolidated dotenv; quote multiline), `log` (print final map), `loadProcess` (merge into `process.env`).

All expansions are progressive within each slice: when applying a `vars` object, keys are expanded left-to-right so later values may reference earlier results.

## Interpolation model (Phase C and per‑plugin)

After dotenv files and config overlays are composed, a final interpolation pass resolves remaining string options using the composed env:

- Phase C (host/generator paths): interpolate remaining string options (e.g., `outputPath`) against `{ ...process.env, ...ctx.dotenv }`. Precedence: ctx wins over parent process.env.
- Per‑plugin interpolation: immediately before a plugin’s `afterResolve`, the host interpolates that plugin’s config slice against `{ ...ctx.dotenv, ...process.env }`. Precedence: parent process.env wins over ctx for per‑plugin slices so upstream runtime adjustments (e.g., AWS creds) are visible to children.

Notes:

- Bootstrap keys are excluded from Phase C (dotenvToken, privateToken, env/defaultEnv, paths/vars and their splitters, `exclude*`, `loadProcess`, `log`, `shell`, `dynamicPath`).
- Interpolation is progressive within a slice; later values can reference earlier results.

## Validation (requiredKeys, schema, and --strict)

You can validate the final composed environment via config:

- JSON/YAML: `requiredKeys?: string[]` — each key must be present (value !== undefined) in the final env.
- JS/TS: `schema?: ZodSchema` — a Zod schema whose `safeParse(finalEnv)` is executed once after Phase C.

Behavior:

- Validation runs once against the composed env (host/generator paths), after overlays and Phase C interpolation.
- By default, issues are printed as warnings. Set `--strict` (or `strict: true` in options) to fail with a non‑zero exit when issues are detected.

Examples:

```yaml
# getdotenv.config.yaml
requiredKeys:
  - APP_SETTING
  - ENV_SETTING
```

```ts
// getdotenv.config.ts
import { z } from 'zod';
export default {
  schema: z.object({
    APP_SETTING: z.string().min(1),
    ENV_SETTING: z.string().optional(),
  }),
};
```

## Diagnostics (redaction and entropy)

Presentation‑only diagnostics help audit values without altering runtime behavior:

- Redaction (`--redact`): masks secret‑like keys (default patterns include SECRET, TOKEN, PASSWORD, API_KEY, KEY) in `-l/--log` and `--trace` outputs. Add patterns with `--redact-pattern <regex...>`.
- Entropy warnings (on by default): once‑per‑key messages when printable strings of length ≥ 16 exceed the Shannon bits/char threshold (default 3.8). Flags:
  - `--entropy-warn` / `--entropy-warn-off`
  - `--entropy-threshold <n>`
  - `--entropy-min-length <n>`
  - `--entropy-whitelist <regex...>` to suppress by key name

## Scripts table (optional)

You can define a scripts table in config and optionally override shell behavior per script. Script strings are resolved by the `cmd` and `batch` commands:

```json
{
  "scripts": {
    "bash-only": { "cmd": "echo $SHELL && echo OK", "shell": "/bin/bash" },
    "plain": { "cmd": "node -v", "shell": false }
  }
}
```

When a script is invoked, `scripts[name].shell` (string or boolean) takes precedence over the global `--shell` setting for that script.

## Example

Project files:

```yaml
# getdotenv.config.yaml (public)
vars:
  FOO: 'foo'
envVars:
  dev:
    BAR: '${FOO}-dev'
```

```yaml
# getdotenv.config.local.yml (private)
vars:
  SECRET: 's3cr3t'
```

JS/TS dynamic (optional):

```ts
// getdotenv.config.ts
export default {
  dynamic: {
    BOTH: ({ FOO = '', BAR = '' }) => `${FOO}-${BAR}`,
  },
};
```

With `--use-config-loader` (or `{ useConfigLoader: true }` on the host), the final map for `env=dev` overlays global public (`FOO`) → env public (`BAR`) → global local (`SECRET`) → dynamic from config (`BOTH`):

```
{ FOO: "foo", BAR: "foo-dev", SECRET: "s3cr3t", BOTH: "foo-foo-dev" }
```
