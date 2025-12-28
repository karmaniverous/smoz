# Interop Note — get-dotenv: plugin config not available crash

## Summary

Running the SMOZ CLI via get-dotenv `createCli` crashes during dotenv resolution with:

> Plugin config not available. Ensure resolveAndLoad() has been called before readConfig().

This blocks `npm run typecheck` because it runs `tsx src/cli/index.ts register`.

## Reproduction (in @karmaniverous/smoz)

```bash
tsx src/cli/index.ts register
```

Observed stack excerpt (Windows):

- `@karmaniverous/get-dotenv/dist/plugins.mjs:1475` — `extended.readConfig(...)` throws
- `@karmaniverous/get-dotenv/dist/plugins.mjs:3140` — `afterResolve` calls `readConfig`
- `@karmaniverous/get-dotenv/dist/cli.mjs` — during `GetDotenvCli.resolveAndLoad()`

Environment (from logs):

- Node: 22.19.0
- @karmaniverous/get-dotenv: installed under `node_modules` (version not printed in stack)

## Root-cause hypothesis (best effort)

`afterResolve` is calling `plugin.readConfig(cli)` at a time when the host has
not yet initialized/stored the plugin config map in `ctx`, OR `readConfig`
assumes plugin config storage exists even when no getdotenv config file was
resolved (should be an empty object instead of throwing).

## Best upstream outcome for SMOZ

In get-dotenv:

- `plugin.readConfig(cli)` should be safe to call after `resolveAndLoad()` even
  when there are no config sources; it should return a validated default/empty
  config rather than throwing “Plugin config not available”.
- Alternatively, ensure config storage is always initialized before any
  `afterResolve` hooks run.

## Acceptance criteria

- In a repo with no `getdotenv.config.*` files, `createCli(...).run(argv)` does
  not throw during resolve.
- `tsx src/cli/index.ts register` succeeds in SMOZ with zero config present.
- `npm run typecheck` in SMOZ completes without this crash.
