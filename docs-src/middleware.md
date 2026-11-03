---
title: HTTP middleware
sidebar_label: Middleware
sidebar_position: 3
---

# HTTP middleware

SMOZ builds a robust Middy stack around HTTP handlers. Non‑HTTP flows bypassMiddy entirely.

## Defaults (in order)

1. HEAD short‑circuit (200 {} immediately)
2. Header normalization (canonical case)
3. APIGW v1 event normalization
4. Content negotiation (JSON, vendor +json)
5. Safe JSON body parsing (no 415 surprises); opt‑in multipart/form‑data parsing (see [below](#multipart-form-data-opt-in))
6. Zod validation (event before handler, response after handler)
7. Error exposure + validation→400 mapping
8. http‑error‑handler with your logger
9. CORS (credentials on; preserves computed origin)
10. Preferred media types defaults across phases
11. Response shaper (statusCode/headers/body) + content‑type enforcement
12. Response serializer (JSON and vendor +json)

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

## Multipart form data (opt-in)

SMOZ can parse `multipart/form-data` request bodies (file uploads) with [`@middy/http-multipart-body-parser`](https://middy.js.org/docs/middlewares/http-multipart-body-parser). It is off by default. To use it, install the parser in your app:

```bash
npm i @middy/http-multipart-body-parser
```

Then enable it with the `multipartBodyParser` option, wherever options are accepted (app defaults, a profile, or a single function). Pass `{}` for the parser's defaults, or parser options:

```ts
export const app = App.create({
  // ...
  http: {
    profiles: {
      uploads: { multipartBodyParser: {} },
    },
  },
});

app.defineFunction({
  // ...
  http: { profile: 'uploads' },
});
```

Set `multipartBodyParser: false` on a function to opt it out of a profile or app default that enables it.

When enabled, the `multipart-body-parser` step runs right after `json-body-parser`:

- Each parser only acts on its own content type, so an endpoint can accept both JSON and multipart. SMOZ sets the parser's `disableContentTypeError: true` (you can override it), so non‑multipart requests pass through instead of failing with 415.
- GET/HEAD requests and empty bodies are skipped, as for JSON.
- Base64‑encoded bodies from API Gateway are decoded.
- The parsed body is passed to your handler **unchanged**, in the parser's own shape: text fields are strings, files are `{ filename, mimetype, encoding, truncated, content }` with `content` a `Buffer`. A field sent more than once becomes an array (text fields only when the name ends in `[]`). Describe this shape in the function's `eventSchema`; for example, use `z.preprocess` to coerce a file field that may arrive once or many times into an array.
- SMOZ adds no size limits of its own. API Gateway and Lambda reject oversized requests, and the parser applies its own defaults (field name size, field and part counts). To set your own, pass `busboy: { limits: { ... } }`; a file over `fileSize` fails with 413.

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
