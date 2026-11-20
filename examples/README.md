# SMOZ Examples

Each example is a short walkthrough: scaffold an app with `smoz init`, add functions with `smoz add`, then generate registers and OpenAPI. No example code is checked in; the CLI writes it.

- [rest-only](./rest-only/README.md): the default template plus a path-parameter endpoint.
- [rest-sqs](./rest-sqs/README.md): adds a non-HTTP SQS function with a queue trigger.
- [rest-step](./rest-step/README.md): adds a non-HTTP Step Functions task.

Every example starts the same way:

```bash
mkdir smoz-example && cd smoz-example
npx -p @karmaniverous/get-dotenv@^8.0.0 -p @karmaniverous/smoz smoz init --yes
```

`smoz init` copies the `default` template (the only one) and installs its dependencies. The app already has two endpoints, `GET /hello` and `GET /openapi`.

Notes

- Scaffolded `lambda.ts` files set a literal `eventType`, which types the handler's event. See [Validation and the handler event](../docs-src/recipes/validation.md).
- `smoz add` accepts native path parameters: `npx smoz add rest/users/:id/get` creates `app/functions/rest/users/[id]/get/*`, writes `basePath: 'users/{id}'`, and adds an OpenAPI parameters entry for `id`.
- `smoz add` never overwrites a file that exists, so adding an endpoint the template already has (`rest/hello/get`) does nothing.
