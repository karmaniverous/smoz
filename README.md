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

- [Overview](https://docs.karmanivero.us/smoz/documents/Overview.html)
- [Why smoz?](https://docs.karmanivero.us/smoz/documents/Why_smoz_.html)
- [Getting started](https://docs.karmanivero.us/smoz/documents/Getting_started.html)
- [10-minute tour](https://docs.karmanivero.us/smoz/documents/10%E2%80%91minute_tour.html)
- [HTTP Middleware](https://docs.karmanivero.us/smoz/documents/HTTP_middleware.html)
- [Recipes](https://docs.karmanivero.us/smoz/documents/Recipes.html)
  - [SQS function](https://docs.karmanivero.us/smoz/documents/Recipes.SQS_function.html)
  - [Step Functions function](https://docs.karmanivero.us/smoz/documents/Recipes.Step_function.html)
  - [Contexts + Cognito authorizer](https://docs.karmanivero.us/smoz/documents/Recipes.Contexts_+_Cognito_authorizer.html) - [Custom middleware insertion](https://docs.karmanivero.us/smoz/documents/Recipes.Custom_middleware_insertion.html)
  - [Per‑function env](<https://docs.karmanivero.us/smoz/documents/Recipes.Per%E2%80%91function_env_(fnEnvKeys).html>)
  - [Observability](<https://docs.karmanivero.us/smoz/documents/Recipes.Observability_(requestId_header).html>)
  - [Troubleshooting](https://docs.karmanivero.us/smoz/documents/Recipes.Troubleshooting.html)
- [Templates](https://docs.karmanivero.us/smoz/documents/Templates.html)
- [CLI](https://docs.karmanivero.us/smoz/documents/CLI.html)
- [Contributing](https://docs.karmanivero.us/smoz/documents/Contributing.html)

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
