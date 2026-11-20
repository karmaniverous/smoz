/**
 * Middy validator for HTTP functions: validates the event before the handler
 * and hands the handler the parsed output overlaid on the raw event;
 * validates the response after it.
 *
 * Errors are "Invalid event"/"Invalid response" so HTTP mode can map them
 * (event → 400); non-HTTP functions throw them (see wrapHandler).
 *
 * @packageDocumentation
 */
import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type { ConsoleLogger, Loggable } from '@/src/types/Loggable';
import { parseWithZod, shapeEvent } from '@/src/util/zodValidate';

export type HttpZodValidatorOptions<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  Logger extends ConsoleLogger,
> = {
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
} & Partial<Loggable<Logger>>;

/**
 * Validate the *incoming* event before business logic runs (replacing it with
 * the parsed output overlaid on the raw event), and the *outgoing* response
 * after it returns (unless a shaped HTTP envelope or a raw string).
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
    if (!eventSchema) return;
    const container = request as unknown as { event?: unknown };
    container.event = shapeEvent(container.event, eventSchema, logger);
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

    parseWithZod(res, responseSchema, logger, 'response');
  },
});
