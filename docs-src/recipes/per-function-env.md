---
title: Per‑function env (fnEnvKeys)
sidebar_label: Per‑function env
---

# Per‑function env (fnEnvKeys)

Expose only what each function needs. Provider‑level env is built from app‑wide exposed keys; add per‑function extras with `fnEnvKeys`.

```ts
// app/functions/rest/admin/things/get/lambda.ts
export const fn = app.defineFunction({
  httpContexts: ['private'],
  fnEnvKeys: ['PROFILE', 'DOMAIN_NAME'], // example; no `as const` needed
  callerModuleUrl: import.meta.url,
});
```

Keys every function needs go in `App.create({ functionDefaults: { fnEnvKeys: [...] } })`; they merge with each function's `fnEnvKeys`.

The handler's `options.env` is typed as exactly the keys the function receives: the app's global and stage `envKeys`, `functionDefaults.fnEnvKeys` and its own `fnEnvKeys`, each typed from its params schema. A key that isn't a params key is a type error.

At build time:

- Provider `environment` contains globally exposed keys from the app config.
- Per‑function `environment` contains only the additional keys you list here, excluding anything already globally exposed.
