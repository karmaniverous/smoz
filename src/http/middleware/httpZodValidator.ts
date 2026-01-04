/**
 * Requirements:
 * - Validate incoming events before the handler (when schema provided).
 * - Validate outgoing responses after the handler (when schema provided).
 * - Throw errors with messages "Invalid event"/"Invalid response" for mapping in HTTP mode; internal mode will simply throw.
 */ import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/src/types/Loggable';
import { pojofy } from '@/src/util/pojofy';

/** Options for the HTTP Zod validator. */
export type HttpZodValidatorOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  /** Zod schema for validating the event. */
  eventSchema?: EventSchema;
  /** Zod schema for validating the response. */
  responseSchema?: ResponseSchema;
} & Partial<Loggable<Logger>>;
const assertWithZod = (
  value: unknown,
  schema: z.ZodType | undefined,
  logger: ConsoleLogger,
  kind: 'event' | 'response',
): void => {
  if (!schema) return;
  logger.debug('validating with zod', value);
  const result = schema.safeParse(value);
  if (result.success) {
    logger.debug('zod validation succeeded', pojofy(result));
    return;
  }

  // Log a structured object for easier debugging.
  logger.error('zod validation failed', pojofy(result));

  // Throw a readable error that upstream layers can interpret.
  // We intentionally use "Invalid event"/"Invalid response" so HTTP mode can map to 400,
  // while internal mode simply throws.
  const msg = kind === 'event' ? 'Invalid event' : 'Invalid response';
  const err = Object.assign(new Error(msg), {
    name: 'ZodError',
    issues: result.error.issues,
  });
  throw err;
};

/**
 * Validate the *incoming* event before business logic runs, and the *outgoing*
 * response after it returns (unless a shaped HTTP envelope or a raw string).
 */
export const httpZodValidator = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
>({
  eventSchema,
  responseSchema,
  logger = console as unknown as Logger,
}: HttpZodValidatorOptions<EventSchema, ResponseSchema, Logger>): MiddlewareObj<
  APIGatewayProxyEvent,
  Context
> => ({
  before: async (request) => {
    const event = (request as unknown as { event?: unknown }).event;
    assertWithZod(event, eventSchema, logger, 'event');
  },
  after: async (request) => {
    const container = request as unknown as { response?: unknown };
    const res = container.response;

    // Skip if the handler already returned a shaped HTTP response...
    const looksShaped =
      typeof res === 'object' &&
      res !== null &&
      'statusCode' in (res as Record<string, unknown>) &&
      'headers' in (res as Record<string, unknown>) &&
      'body' in (res as Record<string, unknown>);

    // ...or a raw string (serializer will pass it through).
    if (looksShaped || typeof res === 'string') return;

    assertWithZod(res, responseSchema, logger, 'response');
  },
});
