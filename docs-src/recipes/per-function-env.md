---
title: Per‑Function env
---

# Per‑function env (fnEnvKeys)

Expose only what each function needs. Provider‑level env is built from app‑wide exposed keys; add per‑function extras with `fnEnvKeys`.

```ts
export const fn = app.defineFunction({
  eventType: 'rest',
  httpContexts: ['private'],
  method: 'get',
  basePath: 'admin/things',
  fnEnvKeys: ['PROFILE', 'DOMAIN_NAME'] as const, // example
  // ...
});
```

At build time:

- Provider `environment` contains globally exposed keys from the app config.
- Per‑function `environment` contains only the additional keys you list here, excluding anything already globally exposed.
