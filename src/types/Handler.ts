import type { Context } from 'aws-lambda';
import type { z } from 'zod';

import type { DeepOverrideHttp } from '@/src/types/DeepOverride';
import type { ConsoleLogger } from '@/src/types/Loggable';
/** Event type after applying deep schema overrides. */
/**
 * Compute the event type as seen by a business handler after Zod overrides.
 */
export type ShapedEvent<
  EventSchema extends z.ZodType | undefined,
  EventType,
> = EventSchema extends z.ZodType
  ? DeepOverrideHttp<EventType, z.infer<EventSchema>>
  : EventType;

/** Handler options shared across invocation modes. */
export type HandlerOptions = {
  /** Typed environment variables. */
  env: Record<string, unknown>;
  /** Present only for HTTP calls; omitted for SQS/Step/etc. */
  securityContext?: unknown;
  /** REQUIRED and must satisfy ConsoleLogger. */
  logger: ConsoleLogger;
};

/** Business handler: returns raw payloads; wrapping layers handle HTTP shaping when applicable. */
/**
 * Business handler signature used by SMOZ.
 *
 * @returns the raw payload; the wrapper applies HTTP shaping when applicable.
 */
export type Handler<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  EventType,
> = (
  event: ShapedEvent<EventSchema, EventType>,
  context: Context,
  options: HandlerOptions,
) => Promise<
  ResponseSchema extends z.ZodType ? z.infer<ResponseSchema> : unknown
>;
