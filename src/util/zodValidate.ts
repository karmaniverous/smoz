/**
 * Zod validation shared by the HTTP and non-HTTP runtime paths: validate a
 * value, throw a readable `Invalid event`/`Invalid response` error on failure,
 * and overlay a parsed event on the raw one so undeclared keys survive.
 *
 * @packageDocumentation
 */
import type { z } from 'zod';

import type { ConsoleLogger } from '@/src/types/Loggable';
import { pojofy } from '@/src/util/pojofy';

/** Which side of the handler a value is validated on. */
export type ZodValidationKind = 'event' | 'response';

/**
 * Validate `value` with `schema` and return the schema's parsed output.
 *
 * @param value - the value to validate
 * @param schema - the schema; when absent, `value` is returned unchanged
 * @param logger - receives debug and error diagnostics
 * @param kind - selects the error message (`Invalid event` or `Invalid response`)
 * @returns the parsed output, or `value` when there is no schema
 * @throws Error named `ZodError`, with the Zod `issues` attached, when validation fails
 */
export const parseWithZod = (
  value: unknown,
  schema: z.ZodType | undefined,
  logger: ConsoleLogger,
  kind: ZodValidationKind,
): unknown => {
  if (!schema) return value;
  // Log the outcome, never the payload: events can carry PII (Cognito
  // attributes, message bodies) and run on every invocation.
  const result = schema.safeParse(value);
  if (result.success) {
    logger.debug(`zod ${kind} validation succeeded`);
    return result.data;
  }

  logger.error(`zod ${kind} validation failed`, pojofy(result.error.issues));

  // The HTTP stack maps "Invalid event" to 400 and "Invalid response" to
  // 500; non-HTTP functions throw it.
  const msg = kind === 'event' ? 'Invalid event' : 'Invalid response';
  throw Object.assign(new Error(msg), {
    name: 'ZodError',
    issues: result.error.issues,
  });
};

/** True for a plain object (a `{}` literal or `Object.create(null)`), not arrays, class instances or primitives. */
const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
};

/**
 * Combine a raw event with its parsed output: top-level keys of `parsed`
 * replace the raw ones; keys `parsed` doesn't carry survive from `raw`.
 *
 * Middleware that runs after validation (e.g. CORS reading `headers`) keeps
 * seeing raw values for keys the schema doesn't declare.
 *
 * @param raw - the event as received
 * @param parsed - the schema's parsed output
 * @returns `{ ...raw, ...parsed }` when both are plain objects; otherwise `parsed`
 */
export const overlayParsed = (raw: unknown, parsed: unknown): unknown =>
  isPlainObject(raw) && isPlainObject(parsed) ? { ...raw, ...parsed } : parsed;

/**
 * Validate an event and return what the handler receives.
 *
 * @param event - the raw event
 * @param schema - the function's `eventSchema`, if any
 * @param logger - diagnostics sink
 * @returns the raw event when there is no schema; otherwise the parsed output overlaid on it
 * @throws Error `Invalid event` (name `ZodError`) when validation fails
 */
export const shapeEvent = (
  event: unknown,
  schema: z.ZodType | undefined,
  logger: ConsoleLogger,
): unknown =>
  schema
    ? overlayParsed(event, parseWithZod(event, schema, logger, 'event'))
    : event;
