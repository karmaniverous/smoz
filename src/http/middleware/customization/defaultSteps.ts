import httpContentNegotiation from '@middy/http-content-negotiation';
import httpCors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { z } from 'zod';

import { asApiMiddleware } from '@/src/http/middleware/asApiMiddleware';
import { httpZodValidator } from '@/src/http/middleware/httpZodValidator';
import { shortCircuitHead } from '@/src/http/middleware/shortCircuitHead';
import { tagStep } from '@/src/http/middleware/transformUtils';
import { wrapSerializer } from '@/src/http/middleware/wrapSerializer';
import type { ConsoleLogger } from '@/src/types/Loggable';

import type { ApiMiddleware, HttpStackOptions, Zodish } from './types';

type M = ApiMiddleware;

export const makeHead = (): M => tagStep(shortCircuitHead as M, 'head');

export const makeHeaderNormalizer = (opts?: HttpStackOptions): M =>
  tagStep(
    asApiMiddleware(
      httpHeaderNormalizer(opts?.headerNormalizer ?? { canonical: true }),
    ),
    'header-normalizer',
  );

export const makeEventNormalizer = (): M =>
  tagStep(asApiMiddleware(httpEventNormalizer()), 'event-normalizer');

export const makeContentNegotiation = (
  contentType: string,
  opts?: HttpStackOptions,
): M => {
  const availableMediaTypes: string[] = [contentType];
  const merged = {
    parseLanguages: false,
    parseCharsets: false,
    parseEncodings: false,
    availableMediaTypes,
    ...(opts?.contentNegotiation ?? {}),
  };
  return tagStep(
    asApiMiddleware(httpContentNegotiation(merged)),
    'content-negotiation',
  );
};

export const makeJsonBodyParser = (opts?: HttpStackOptions): M => {
  const inner = asApiMiddleware(
    httpJsonBodyParser({
      disableContentTypeError: true,
      ...(opts?.jsonBodyParser ?? {}),
    }),
  );
  const mw: M = {};
  mw.before = async (request) => {
    const event = (request as unknown as { event?: APIGatewayProxyEvent })
      .event;
    if (!event) return;
    const method = (
      event.httpMethod ||
      (event as unknown as { requestContext?: { http?: { method?: string } } })
        .requestContext?.http?.method ||
      ''
    ).toUpperCase();
    if (method === 'GET' || method === 'HEAD') return;
    if (!event.body) return;
    if (inner.before) await inner.before(request);
  };
  return tagStep(mw, 'json-body-parser');
};

export const makeZodBefore = (
  logger: ConsoleLogger,
  eventSchema?: Zodish,
): M => {
  const base = httpZodValidator({
    logger,
    ...(eventSchema ? { eventSchema } : {}),
  });
  const mw: M = {};
  if (base.before) mw.before = base.before;
  return tagStep(mw, 'zod-before');
};

export const makeZodAfter = (
  logger: ConsoleLogger,
  responseSchema?: Zodish,
): M => {
  const base = httpZodValidator({
    logger,
    ...(responseSchema ? { responseSchema } : {}),
  });
  const mw: M = {};
  if (base.after) mw.after = base.after;
  return tagStep(mw, 'zod-after');
};

export const makeHeadFinalize = (contentType: string): M =>
  tagStep(
    {
      after: (request) => {
        const evt = (request as unknown as { event?: APIGatewayProxyEvent })
          .event;
        if (!evt) return;
        const method = (
          evt.httpMethod ||
          (
            evt as unknown as {
              requestContext?: { http?: { method?: string } };
            }
          ).requestContext?.http?.method ||
          ''
        ).toUpperCase();
        if (method !== 'HEAD') return;
        (
          request as unknown as {
            response: {
              statusCode: number;
              headers?: Record<string, string>;
              body?: unknown;
            };
          }
        ).response = {
          statusCode: 200,
          headers: { 'Content-Type': contentType },
          body: {},
        };
      },
    },
    'head-finalize',
  );

export const makePreferredMedia = (contentType: string): M =>
  tagStep(
    {
      before: (request) => {
        const req = request as { preferredMediaTypes?: string[] };
        if (!Array.isArray(req.preferredMediaTypes))
          req.preferredMediaTypes = [contentType];
        const ri = request as { internal?: Record<string, unknown> };
        if (!ri.internal) ri.internal = {};
        const internal = ri.internal as { preferredMediaTypes?: string[] };
        if (!Array.isArray(internal.preferredMediaTypes))
          internal.preferredMediaTypes = [contentType];
      },
      after: (request) => {
        const req = request as { preferredMediaTypes?: string[] };
        if (!Array.isArray(req.preferredMediaTypes))
          req.preferredMediaTypes = [contentType];
      },
      onError: (request) => {
        const req = request as { preferredMediaTypes?: string[] };
        if (!Array.isArray(req.preferredMediaTypes))
          req.preferredMediaTypes = [contentType];
      },
    },
    'preferred-media',
  );

export const makeErrorExpose = (logger: ConsoleLogger): M =>
  tagStep(
    {
      onError: (request) => {
        void logger;
        const maybe = (request as { error?: unknown }).error;
        if (!(maybe instanceof Error)) return;
        const msg = typeof maybe.message === 'string' ? maybe.message : '';
        (maybe as { expose?: boolean }).expose = true;
        if (
          typeof (maybe as { statusCode?: unknown }).statusCode !== 'number' &&
          ((typeof (maybe as { name?: unknown }).name === 'string' &&
            (maybe as { name: string }).name.toLowerCase().includes('zod')) ||
            /invalid (event|response)/i.test(msg))
        ) {
          (maybe as { statusCode?: number }).statusCode = 400;
        }

        // JSON-encode the error message so middy's httpErrorHandler emits
        // application/json instead of text/plain. Guard against double-encoding
        // since this step is registered in both the after and onError arrays.
        try {
          const parsed: unknown = JSON.parse(msg);
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'statusCode' in parsed &&
            'message' in parsed
          )
            return;
        } catch {
          // not JSON — proceed with encoding
        }
        const statusCode =
          typeof (maybe as { statusCode?: unknown }).statusCode === 'number'
            ? (maybe as unknown as { statusCode: number }).statusCode
            : 500;
        // Ensure statusCode is set so middy's httpErrorHandler doesn't
        // discard the message with its fallback replacement.
        if (
          typeof (maybe as { statusCode?: unknown }).statusCode !== 'number'
        ) {
          (maybe as unknown as { statusCode: number }).statusCode = statusCode;
        }
        const message = msg || 'Internal Server Error';
        maybe.message = JSON.stringify({ statusCode, message });
      },
    },
    'error-expose',
  );

export const makeErrorHandler = (opts?: HttpStackOptions): M =>
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

export const makeCors = (opts?: HttpStackOptions): M =>
  tagStep(
    asApiMiddleware(
      httpCors({
        credentials: true,
        getOrigin: (o) => o,
        ...(opts?.cors ?? {}),
      }),
    ),
    'cors',
  );

/**
 * Detect a shaped Lambda Proxy response.
 *
 * A response is "shaped" when it has a `statusCode` property — the
 * definitive marker of an API-Gateway-style response envelope.  Missing
 * `headers` or `body` are defaulted rather than treated as "unshaped",
 * because `{ statusCode, headers }` (no body) is a valid Lambda response.
 */
const isShapedResponse = (
  v: unknown,
): v is {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
} =>
  typeof v === 'object' &&
  v !== null &&
  'statusCode' in (v as Record<string, unknown>);

/** Shape the response into a well-formed Lambda Proxy result. */
const shapeResponse = (
  current: unknown,
  contentType: string,
): { statusCode: number; headers: Record<string, string>; body: unknown } => {
  let res: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
  if (isShapedResponse(current)) {
    res = current;
  } else {
    res = { statusCode: 200, headers: {}, body: current };
  }
  // Default missing fields for shaped responses without body/headers.
  if (res.body === undefined) res.body = '';
  if (res.body !== undefined && typeof res.body !== 'string') {
    try {
      res.body = JSON.stringify(res.body);
    } catch {
      res.body = String(res.body);
    }
  }
  const headers = res.headers ?? {};
  if (!headers['Content-Type']) headers['Content-Type'] = contentType;
  res.headers = headers;
  return res as {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
  };
};

export const makeShapeAndContentType = (contentType: string): M =>
  tagStep(
    {
      after: (request) => {
        const container = request as unknown as { response?: unknown };
        if (container.response === undefined) return;
        container.response = shapeResponse(container.response, contentType);
      },
    },
    'shape',
  );

export const makeSerializer = (
  contentType: string,
  opts?: HttpStackOptions,
): M =>
  tagStep(
    asApiMiddleware(
      httpResponseSerializer({
        serializers: [
          {
            regex: /^application\/(?:[a-z0-9.+-]*\+)?json$/i,
            serializer: wrapSerializer(
              ({ body }) =>
                typeof body === 'string'
                  ? body
                  : (opts?.serializer?.json?.stringify ?? JSON.stringify)(body),
              {
                label: opts?.serializer?.json?.label ?? 'json',
                logger: opts?.logger ?? console,
              },
            ),
          },
        ],
        defaultContentType: contentType,
      }),
    ),
    'serializer',
  );

/**
 * Apply CORS headers to error responses.
 *
 * middy v6+ does not re-run the `after` chain after `onError` handles an
 * error, so the regular CORS `after` hook never fires for error responses.
 * This dedicated `onError` step runs *after* the error handler has set
 * `request.response`, ensuring CORS headers are present on error responses.
 */
export const makeOnErrorCors = (opts?: HttpStackOptions): M => {
  const cors = httpCors({
    credentials: true,
    getOrigin: (o: string) => o,
    ...(opts?.cors ?? {}),
  });
  return tagStep(
    {
      onError: async (request) => {
        if ((request as { response?: unknown }).response === undefined) return;
        if (cors.after) await cors.after(request as never);
      },
    },
    'error-cors',
  );
};

/**
 * Shape error responses into well-formed Lambda Proxy results.
 *
 * Mirrors `makeShapeAndContentType` but runs on the `onError` path,
 * ensuring error responses have proper `statusCode`, `headers`, and
 * `body` structure even when the `after` chain is skipped.
 */
export const makeOnErrorShape = (contentType: string): M =>
  tagStep(
    {
      onError: (request) => {
        const container = request as unknown as { response?: unknown };
        if (container.response === undefined) return;
        container.response = shapeResponse(container.response, contentType);
      },
    },
    'error-shape',
  );

export const buildDefaultPhases = (args: {
  contentType: string;
  logger: ConsoleLogger;
  opts?: HttpStackOptions;
  eventSchema?: z.ZodType | undefined;
  responseSchema?: z.ZodType | undefined;
}): { before: M[]; after: M[]; onError: M[] } => {
  const { contentType, logger, opts, eventSchema, responseSchema } = args;
  const before: M[] = [
    makeHead(),
    makeHeaderNormalizer(opts),
    makeEventNormalizer(),
    makeContentNegotiation(contentType, opts),
    makeJsonBodyParser(opts),
    makeZodBefore(logger, eventSchema),
  ];
  const after: M[] = [
    makeHeadFinalize(contentType),
    makeZodAfter(logger, responseSchema),
    makeErrorExpose(logger),
    makeCors(opts),
    makePreferredMedia(contentType),
    makeShapeAndContentType(contentType),
    makeSerializer(contentType, opts),
  ];
  const onError: M[] = [
    makeErrorExpose(logger),
    makeErrorHandler(opts),
    // Post-error-handler processing: middy v6+ does not re-run the after
    // chain after onError, so CORS and response shaping must happen here.
    makeOnErrorCors(opts),
    makeOnErrorShape(contentType),
  ];
  return { before, after, onError };
};

/** Public helper: build default phases suitable for replace scenarios. */
export type BuildSafeDefaultsArgs = Parameters<typeof buildDefaultPhases>[0];
export const buildSafeDefaults = (args: BuildSafeDefaultsArgs) =>
  buildDefaultPhases(args);
