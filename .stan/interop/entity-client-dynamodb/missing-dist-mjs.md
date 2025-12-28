# Interop Note — entity-client-dynamodb: missing dist/mjs entry

## Summary

The SMOZ inline server integration test fails because Node cannot resolve:

`node_modules/@karmaniverous/entity-client-dynamodb/dist/mjs/index.js`

This manifests as `ERR_MODULE_NOT_FOUND` when importing `@karmaniverous/entity-client-dynamodb`
from the SMOZ `/app` fixture.

## Reproduction (in @karmaniverous/smoz)

```bash
npm test
```

Failing suite:

- `src/cli/local/inline.server.test.ts` (inline server exits early)

Error excerpt (Windows):

> Cannot find module '.../node_modules/@karmaniverous/entity-client-dynamodb/dist/mjs/index.js'
> imported from .../app/entity/entityClient.ts

## Root-cause hypothesis (best effort)

One of:

- Local workspace/link install points `node_modules/@karmaniverous/entity-client-dynamodb`
  at a source checkout that has not run its build, so `dist/` is absent.
- The published package version referenced in SMOZ has an exports map that points
  at `dist/mjs/index.js`, but the file is not included in the published artifact.

## Best upstream outcome for SMOZ

In entity-client-dynamodb:

- Ensure the published package contains the `dist/mjs/index.js` entry (and any
  corresponding CJS/types files) that `exports` references.
- If using workspace installs for local dev, ensure build steps are part of the
  dev workflow so downstream repos don’t observe missing `dist/`.

## Acceptance criteria

- Fresh install of SMOZ dependencies provides
  `node_modules/@karmaniverous/entity-client-dynamodb/dist/mjs/index.js`.
- `npm test` in SMOZ passes, including `src/cli/local/inline.server.test.ts`.
