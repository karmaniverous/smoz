---
title: Custom middleware insertion
sidebar_label: Custom middleware
---

# Custom middleware (insertAfter 'shape')

Add a header after the response is shaped:

```ts
import { insertAfter } from '@karmaniverous/smoz/http';

const addHeader = {
  after: (req: unknown) => {
    const r = req as { response?: { headers?: Record<string, string> } };
    if (!r.response) return;
    r.response.headers = {
      ...(r.response.headers ?? {}),
      'X-Transform': 'yes',
    };
  },
};

export const fn = app.defineFunction({
  callerModuleUrl: import.meta.url,
  http: {
    transform: ({ before, after, onError }) => ({
      before,
      after: insertAfter(after, 'shape', addHeader as never),
      onError,
    }),
  },
});
```

See the [Middleware] page for invariants and other transform helpers.

[Middleware]: ../middleware.md
