---
title: Per‑function env (fnEnvKeys)
sidebar_label: Per‑function env
---

# Per‑function env (fnEnvKeys)

Expose only what each function needs. Provider‑level env is built from app‑wide exposed keys; add per‑function extras with `fnEnvKeys`.

```ts
// app/functions/rest/admin/things/get/lambda.ts
export const fn = app.defineFunction({
  eventType: 'rest',
  httpContexts: ['private'],
  fnEnvKeys: ['PROFILE', 'DOMAIN_NAME'] as const, // example
  callerModuleUrl: import.meta.url,
});
```

Keys every function needs go in `App.create({ functionDefaults: { fnEnvKeys: [...] } })`; they merge with each function's `fnEnvKeys`.

At build time:

- Provider `environment` contains globally exposed keys from the app config.
- Per‑function `environment` contains only the additional keys you list here, excluding anything already globally exposed.
