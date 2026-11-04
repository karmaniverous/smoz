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
- App-wide function defaults (optional; `functionDefaults.http` in `App.create`): the same shape as a function's `http`, applied to every function. A function's own `http` keys win and `options` merge key by key (see "App-wide defaults" in the [Overview](./overview.md)).

Options resolve in this order, later layers winning: built-in defaults, `http.defaults`, the selected profile, then the function-level options (`functionDefaults.http.options` merged with the function's `http.options`).

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

// app/functions/rest/user/logo/post/lambda.ts
export const fn = app.defineFunction({
  eventType: 'rest',
  callerModuleUrl: import.meta.url,
  http: { profile: 'uploads' },
});
```

Set `multipartBodyParser: false` on a function to opt it out of a profile or app default that enables it. Options merge shallowly, like every other stack option: a function's `multipartBodyParser: { ... }` replaces a profile's object entirely rather than merging into it.

If you enable the option without installing the package, requests with a body fail with an error naming the missing package. Apps that never enable it don't need it installed, and bundling (e.g. the Serverless Framework's esbuild) still succeeds. The published type declarations reference the package for the option's type; with `skipLibCheck: true` (the SMOZ template default) that needs nothing installed.

When enabled, the `multipart-body-parser` step runs right after `json-body-parser`:

- Each parser only acts on its own content type, so an endpoint can accept both JSON and multipart. SMOZ sets the parser's `disableContentTypeError: true` (you can override it), so non‑multipart requests pass through instead of failing with 415.
- GET/HEAD requests and empty bodies are skipped, as for JSON.
- Base64‑encoded bodies from API Gateway are decoded.
- The parser only recognises `multipart/form-data; boundary=<letters, digits, hyphens>` with an optional trailing `; charset=...`. Anything else (a quoted boundary, as .NET `HttpClient` sends; `charset` before `boundary`; other boundary characters) is treated as "not multipart" and the body reaches your handler as a raw string, usually failing your `eventSchema` with a 400. If your clients send such headers, set `disableContentTypeCheck: true` (the step then parses every request with a body, so don't combine it with JSON on the same function) or normalise the header upstream.
- The parsed body is passed to your handler **unchanged**, in the parser's own shape (an object with a null prototype):
  - A text field is a string. Sent again under the same name, the **last value wins**.
  - A text field whose name ends in `[...]` (e.g. `tags[]`) is always an **array**, under the name with the brackets stripped (`tags`), even when sent once.
  - A file is `{ filename, mimetype, encoding, truncated, content }`, with `content` a `Buffer`. The key is the field name as sent (brackets kept). Sent more than once, it becomes an **array, newest first**.

  Describe this shape in the function's `eventSchema`; for example, use `z.preprocess` to coerce a file field that may arrive once or many times into an array.

- SMOZ adds no size limits of its own. API Gateway and Lambda reject oversized requests. The parser's own defaults are `fieldNameSize: 100`, `fields: 1000` and `parts: 1000`; pass `busboy: { limits: { ... } }` to change these or set others. Limits behave differently:
  - a file over `fileSize` fails the request with **413**;
  - a field name over `fieldNameSize` fails with **422**;
  - a text field over `fieldSize` (busboy default 1 MiB) is **silently truncated**;
  - parts beyond `files`, `fields` or `parts` are **silently dropped**.

## Invariants

- `head` first in `before`
- `serializer` last in `after`
- `shape` precedes `serializer`
- `error-handler` only in `onError`
- If event/response schemas are present, `zod-before` and `zod-after` must exist

## Examples

Choose a profile and override content type:

```ts
export const fn = app.defineFunction({
  eventType: 'rest',
  callerModuleUrl: import.meta.url,
  http: {
    profile: 'publicJson', // defined in App.create({ http: { profiles } })
    options: { contentType: 'application/vnd.my+json' },
  },
});
```

Insert a header after the response shaper:

```ts
import { insertAfter } from '@karmaniverous/smoz/http';
const mw = {
  after: (req: any) => {
    req.response.headers['X-My'] = 'yes';
  },
};
export const fn = app.defineFunction({
  eventType: 'rest',
  callerModuleUrl: import.meta.url,
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
export const fn = app.defineFunction({
  eventType: 'rest',
  callerModuleUrl: import.meta.url,
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
