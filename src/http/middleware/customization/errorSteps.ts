/**
 * Error steps of the HTTP stack: `error-expose` (status mapping and a JSON
 * error body) and `error-handler` (middy's http-error-handler).
 *
 * @packageDocumentation
 */
import httpErrorHandler from '@middy/http-error-handler';

import { asApiMiddleware } from '@/src/http/middleware/asApiMiddleware';
import { tagStep } from '@/src/http/middleware/transformUtils';

import type { ApiMiddleware, HttpStackOptions } from './types';

/** An error as the HTTP stack sees it. */
type HttpError = Error & { statusCode?: unknown; expose?: boolean };

/**
 * Status for an error that carries none.
 *
 * A response that fails `responseSchema` is the handler's fault (500). An
 * invalid event, or any other Zod error, is the client's (400). Anything else
 * is a 500.
 *
 * @param error - the error thrown in the stack
 */
export const statusForError = (error: Error): number => {
  if (/invalid response/i.test(error.message)) return 500;
  if (/invalid event/i.test(error.message)) return 400;
  return error.name.toLowerCase().includes('zod') ? 400 : 500;
};

/** True when `message` is already the `{ statusCode, message }` JSON body. */
const isEncoded = (message: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(message);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      'statusCode' in parsed &&
      'message' in parsed
    );
  } catch {
    return false;
  }
};

/**
 * `error-expose`: gives the error a status (keeping one it has), marks it
 * exposed and JSON-encodes its message, so middy's http-error-handler answers
 * `application/json` `{ statusCode, message }` instead of a text fallback.
 */
export const makeErrorExpose = (): ApiMiddleware =>
  tagStep(
    {
      onError: (request) => {
        const error = (request as { error?: unknown }).error;
        if (!(error instanceof Error)) return;
        const http = error as HttpError;
        http.expose = true;
        if (typeof http.statusCode !== 'number')
          http.statusCode = statusForError(error);
        // Registered in both the after and onError arrays: encode once.
        if (isEncoded(error.message)) return;
        error.message = JSON.stringify({
          statusCode: http.statusCode,
          message: error.message || 'Internal Server Error',
        });
      },
    },
    'error-expose',
  );

/** `error-handler`: middy's http-error-handler, logging through the stack's logger. */
export const makeErrorHandler = (opts?: HttpStackOptions): ApiMiddleware =>
  tagStep(
    asApiMiddleware(
      httpErrorHandler({
        ...(opts?.errorHandler ?? {}),
        logger: (o) => {
          const lg = opts?.logger ?? console;
          if (typeof lg.error === 'function') lg.error(o);
        },
      }),
    ),
    'error-handler',
  );
