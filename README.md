<div align="center">

# SMOZ

[Serverless](https://www.serverless.com/) · [Middy](https://middy.js.org/) · [OpenAPI 3.1](https://spec.openapis.org/oas/latest.html) · [Zod](https://zod.dev/)

[![npm version](https://img.shields.io/npm/v/@karmaniverous/smoz.svg)](https://www.npmjs.com/package/@karmaniverous/smoz)
![Node Current](https://img.shields.io/node/v/@karmaniverous/smoz)
[![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/smoz)
[![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](https://github.com/karmaniverous/smoz/tree/main/CHANGELOG.md)
[![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](https://github.com/karmaniverous/smoz/tree/main/LICENSE.md)

</div>

SMOZ is a small, pragmatic toolkit for authoring AWS Lambda handlers with [Middy] and [Zod], then aggregating Serverless functions and hand‑crafted OpenAPI 3.1 paths from a single, schema‑first application definition.

- Keep prod code testable and framework‑agnostic
- HTTP middleware with validation, shaping, errors, CORS, negotiation, and HEAD
- Non‑HTTP flows stay lean (no middleware overhead)

## Quick start (from zero)

From an empty directory:

```bash
npx @karmaniverous/smoz init -i
npx smoz dev -p 3000
```

- The first command scaffolds a new app and installs dependencies (including a local `smoz` bin).
- The second command starts the inline local backend and keeps registers + OpenAPI fresh.
- Open http://localhost:3000/openapi in your browser.

Prefer `serverless‑offline`?

```bash
npx smoz dev -l offline -p 3000
```

Add your first endpoint (avoid clashing with the template’s hello):

```bash
npx smoz add rest/foo/get
```

## Quick links

- [Overview](./docs-src/overview.md)
- [Why smoz?](./docs-src/why-smoz.md)
- [Getting started](./docs-src/getting-started.md)
- [10-minute tour](./docs-src/tour-10-minutes.md)
- [HTTP Middleware](https://docs.karmanivero.us/smoz/documents/HTTP_middleware.html)
- [Recipes](./docs-src/recipes/index.md)
  - [SQS function](./docs-src/recipes/sqs.md)
  - [Step Functions function](./docs-src/recipes/step.md)
  - [Contexts + Cognito authorizer](./docs-src/recipes/contexts-auth.md) - [Custom middleware insertion](./docs-src/recipes/custom-middleware.md)
  - [Per‑function env](./docs-src/recipes/per-function-env.md)
  - [Observability](./docs-src/recipes/observability.md)
  - [Troubleshooting](./docs-src/recipes/troubleshooting.md)
- [Templates](./docs-src/templates.md)
- [CLI](./docs-src/cli.md)
- [Contributing](./CONTRIBUTING.md)

## Install

```bash
npm i @karmaniverous/smoz zod zod-openapi
```

## Dev tooling (recommended):

```bash
npm i -D typescript typescript-eslint eslint prettier typedoc
```

## Docs and reference

- [Docs site](https://docs.karmanivero.us/smoz)
- [Changelog](./CHANGELOG.md)
- [License](LICENSE)
- [Middy](https://middy.js.org/)
- [Zod](https://zod.dev/)
