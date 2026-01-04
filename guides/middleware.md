---
title: Middleware
---

# HTTP middleware

SMOZ builds a robust Middy stack around HTTP handlers. Non‑HTTP flows bypass Middy entirely.

## Middleware Phases

The stack is organized into three phases: `before` (request processing), `after` (successful response processing), and `onError` (error handling).

### `before` phase (request)

Runs before your handler.

1.  **HEAD short‑circuit**: Responds with `200 {}` immediately for `HEAD` requests, bypassing the handler.
2.  **Header normalization**: Converts header keys to canonical case (e.g., `content-type` → `Content-Type`).
3.  **Event normalization**: Normalizes API Gateway v1 events to prevent common access errors on `null` properties.
4.  **Content negotiation**: Determines the best response `Content-Type` from `Accept` headers.
5.  **JSON body parsing**: Safely parses JSON bodies for non-GET/HEAD requests without throwing 415 errors on missing content types.
6.  **Zod validation**: Validates the incoming event against your `eventSchema`.

### `after` phase (response)

Runs after your handler returns successfully.

1.  **Zod validation**: Validates the handler’s return value against your `responseSchema`.
2.  **CORS**: Injects CORS headers (e.g., `Access-Control-Allow-Origin`).
3.  **Response shaping**: Wraps raw handler output into the required `{ statusCode, headers, body }` structure and enforces the negotiated `Content-Type`.
4.  **Response serialization**: Serializes the response body (e.g., using `JSON.stringify`).

### `onError` phase (errors)

Runs if any `before` middleware or your handler throws an error.

1.  **Error exposure**: Maps Zod validation errors to 400-level HTTP errors and ensures other errors are HTTP-friendly.
2.  **Error handling**: Formats the final error response, logging the error with your logger.

## Customization surfaces

- App level (optional; in `App.create`):
  - `http.defaults`: base options (e.g., contentType, logger)
  - `http.profiles`: named profiles (options + extend/transform)
- Function level (optional; in `app.defineFunction`):
  - `http.profile`: choose one profile by name
  - `http.options`: shallow overrides
  - `http.extend`: append steps into phases
  - `http.transform`: insert/replace/remove steps by ID
  - `http.replace`: phased arrays or a single middleware (advanced)

## Invariants

- `head` first in `before`
- `serializer` last in `after`
- `shape` precedes `serializer`
- `error-handler` only in `onError`
- If event/response schemas are present, `zod-before` and `zod-after` must exist

## Examples

Choose a profile and override content type:

```ts
app.defineFunction({
  // ...
  http: {
    profile: 'publicJson',
    options: { contentType: 'application/vnd.my+json' },
  },
});
```

Insert a header after the response shaper:

```ts
import { insertAfter } from '@karmaniverous/smoz';
const mw = {
  after: (req: any) => {
    req.response.headers['X-My'] = 'yes';
  },
};
app.defineFunction({
  // ...
  http: {
    transform: ({ before, after, onError }) => ({
      before,
      after: insertAfter(after, 'shape', mw as any),
      onError,
    }),
  },
});
```

Replace (advanced):

```ts
app.defineFunction({
  // ...
  http: {
    replace: {
      stack: {
        before: [...],  // include 'head' and 'zod-before' when schemas are present
        after:  [...],  // ensure 'shape' before 'serializer'; include 'zod-after'
        onError: [...], // include 'error-handler' only here
      },
    },
  },
});
```
