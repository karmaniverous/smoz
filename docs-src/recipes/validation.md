---
title: Validation and the handler event
sidebar_label: Validation
---

# Validation and the handler event

A function's `eventSchema` runs before its handler and its `responseSchema` after it, on HTTP and non-HTTP functions alike. Types match what the runtime delivers.

## What the handler receives

With an `eventSchema`, the handler gets the schema's **parsed output overlaid on the raw event**: `{ ...raw, ...parsed }`.

- Every top-level key the schema declares carries its parsed value, so `z.coerce`, `.transform` and `.default` work as written.
- Every key the schema doesn't declare keeps its raw value, for the handler and for middleware that runs later (CORS reads `headers` to find the origin).
- A declared key is replaced **wholly**, not merged: declare `queryStringParameters: z.object({ limit: z.coerce.number() })` and the handler's `queryStringParameters` is exactly `{ limit: number }`.

Two edge cases follow from the same rule. A schema whose output isn't a plain object (an array, a primitive, a class instance) replaces the event outright. An optional schema (`z.object({...}).optional()`) types the event as `... | undefined`, as it is at runtime when the event is absent.

The handler's event type follows the same rule: the base event (e.g. `APIGatewayProxyEvent` for `eventType: 'rest'`) with each declared key replaced by the schema's output type. Index-signature schemas declare nothing, so `z.object({})` leaves the event type as is.

```ts
export const eventSchema = z.object({
  queryStringParameters: z.object({ limit: z.coerce.number().default(10) }),
});

export const handler = fn.handler(async (event) => {
  const { limit } = event.queryStringParameters; // number, at runtime too
  const method = event.httpMethod; // undeclared: raw, typed from the base event
  return { limit, method };
});
```

### Declaring `headers`

Because a declared key is replaced wholly, a strict `z.object` for `headers` strips every header it doesn't list, including `Origin`, which CORS needs. Declare headers with `z.looseObject` (or `.loose()`) so the rest survive. Header names reach the schema already normalized to canonical case (`X-Api-Key`, not `x-api-key`):

```ts
export const eventSchema = z.object({
  headers: z.looseObject({ 'X-Api-Key': z.string() }),
});
```

## Typing the handler's event: `eventType`

`defineFunction` derives `eventType` from the folder at runtime, but only a literal `eventType` narrows the handler's event type. `smoz init` and `smoz add` write it for you:

```ts
export const fn = app.defineFunction({
  eventType: 'rest', // types the event as APIGatewayProxyEvent
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
});
```

Without it, the event type is the union of every event in the app's `eventTypeMapSchema`, with the schema's declared keys applied to each member.

## The handler's return value

The handler returns what `responseSchema` validates: its **input** type (`z.input`). It is the same as the output type unless the schema transforms. The value is validated, not transformed: what the handler returns is what is sent.

Don't cast `fn` or the handler's return value; the types are already right, and a cast turns off the response check.

## Failures

- **HTTP** (`rest`, `http`, and any token in `httpEventTypeTokens`): an invalid event is a `400` (`Invalid event`: the client's fault); a response that fails `responseSchema` is a `500` (`Invalid response`: the handler's fault).
- **Non-HTTP:** the wrapper throws `Invalid event` before the handler runs, or `Invalid response` after it (an `Error` named `ZodError`, with the Zod `issues` attached). What a throw means depends on the source:

| Event type                 | Effect of a throw                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `sqs`                      | The batch fails and its messages return to the queue: retried, then sent to the dead-letter queue if any.              |
| `cognito-userpool`         | The user pool operation (sign-up, sign-in, token generation) fails for the user.                                       |
| `step`                     | The task fails; the state machine's `Retry`/`Catch` decide what happens next.                                          |
| `sns`, `s3`, `eventbridge` | Asynchronous invocation: Lambda retries, then sends the event to the function's failure destination or DLQ.            |
| `dynamodb`, `kinesis`      | The batch is retried until it succeeds or expires, blocking the shard unless the mapping bisects or skips.             |
| `cloudwatch-logs`          | Asynchronous invocation: Lambda retries, then sends the event to the function's failure destination or DLQ.            |
| `ses`                      | Asynchronous by default (retries as above); with `RequestResponse` invocation the receipt rule's action fails.         |
| `firehose`                 | The transformation fails; Firehose retries for its retry duration, then writes the records to the error output prefix. |
| `alb`                      | Not HTTP by default (not in `httpEventTypeTokens`): the client gets a `502`.                                           |
| `cloudfront`               | Lambda@Edge: the viewer gets a `5xx` error.                                                                            |
| custom tokens              | Whatever the invoker does with a failed invocation.                                                                    |

Validate only what the function relies on: a schema stricter than the real events fails every invocation.
