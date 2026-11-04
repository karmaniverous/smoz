---
title: Observability (requestId header)
sidebar_label: Observability
---

# Observability (requestId header)

Propagate a request id from API Gateway into responses for traceability.

```ts
import { insertAfter } from '@karmaniverous/smoz/http';

const echoRequestId = {
  after: (req: unknown) => {
    const r = req as {
      event?: { requestContext?: { requestId?: string } };
      response?: { headers?: Record<string, string> };
    };
    const id =
      r.event?.requestContext?.requestId ??
      (r as { event?: { requestContext?: { requestId?: string } } }).event
        ?.requestContext?.requestId;
    if (!id) return;
    if (!r.response) return;
    r.response.headers = { ...(r.response.headers ?? {}), 'X-Request-Id': id };
  },
};

export const fn = app.defineFunction({
  callerModuleUrl: import.meta.url,
  http: {
    transform: ({ before, after, onError }) => ({
      before,
      after: insertAfter(after, 'shape', echoRequestId as never),
      onError,
    }),
  },
});
```

Note: The SMOZ runtime uses a Console‑compatible logger. You can add your own structured logs in the business handler or via additional middleware.
