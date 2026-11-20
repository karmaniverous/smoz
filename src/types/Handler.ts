/**
 * Business handler types: the shaped event a handler receives (its event
 * schema's parsed output overlaid on the base event), the options it gets
 * (typed env, logger), and the handler signature itself.
 *
 * @packageDocumentation
 */
import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger } from '@/src/types/Loggable';

/**
 * The event a business handler receives, matching what the runtime delivers.
 *
 * Without an event schema, the base event. With one, the schema's parsed
 * output (`z.output`) overlaid on the base event: each top-level key the
 * schema declares has the schema's output type (wholly replacing the base
 * key, including AWS index-signature maps such as `queryStringParameters`);
 * every other key keeps its base type. A schema whose output is `unknown`
 * (e.g. `z.unknown()`) leaves the base event as is. A union base (the event
 * type of a function defined without `eventType`) is shaped member by member.
 * A non-object output (array, primitive) replaces the event, as at runtime.
 *
 * @typeParam EventSchema - the function's event schema, if any
 * @typeParam EventType - the base event type (e.g. `APIGatewayProxyEvent`)
 */
export type ShapedEvent<
  EventSchema extends z.ZodType | undefined,
  EventType,
> = EventSchema extends z.ZodType
  ? unknown extends z.output<EventSchema>
    ? EventType
    : EventType extends unknown
      ? z.output<EventSchema> extends infer Output
        ? Output extends readonly unknown[]
          ? Output
          : Output extends object
            ? Omit<EventType, keyof Output> & Output
            : Output
        : never
      : never
  : EventType;

/**
 * Handler options shared across invocation modes.
 *
 * @typeParam Env - the env the function receives: the app's global and stage
 * `envKeys` plus its `fnEnvKeys`, each typed from its params schema
 */
export type HandlerOptions<
  Env extends Record<string, unknown> = Record<string, unknown>,
> = {
  env: Env;
  /** Present only for HTTP calls; omitted for SQS/Step/etc. */
  securityContext?: unknown;
  /** REQUIRED and must satisfy ConsoleLogger. */
  logger: ConsoleLogger;
};

/**
 * Business handler signature used by SMOZ.
 *
 * @typeParam EventSchema - validated before the handler; shapes the event
 * @typeParam ResponseSchema - validated after the handler; types the return
 * @typeParam EventType - the base event type
 * @typeParam Env - the typed env in `options.env`
 * @returns the raw payload; the wrapper applies HTTP shaping when applicable.
 */
export type Handler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  EventType,
  Env extends Record<string, unknown> = Record<string, unknown>,
> = (
  event: ShapedEvent<EventSchema, EventType>,
  context: Context,
  options: HandlerOptions<Env>,
) => Promise<
  ResponseSchema extends z.ZodType ? z.infer<ResponseSchema> : unknown
>;
