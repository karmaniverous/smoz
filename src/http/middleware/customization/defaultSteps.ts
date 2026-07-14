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
        // application/json instead of text/plain.
        const statusCode =
          typeof (maybe as { statusCode?: unknown }).statusCode === 'number'
            ? (maybe as unknown as { statusCode: number }).statusCode
            : 500;
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

export const makeShapeAndContentType = (contentType: string): M =>
  tagStep(
    {
      after: (request) => {
        const container = request as unknown as { response?: unknown };
        const current = container.response;
        if (current === undefined) return;
        const looksShaped =
          typeof current === 'object' &&
          current !== null &&
          'statusCode' in (current as Record<string, unknown>) &&
          'headers' in (current as Record<string, unknown>) &&
          'body' in (current as Record<string, unknown>);
        let res: {
          statusCode: number;
          headers?: Record<string, string>;
          body?: unknown;
        };
        if (looksShaped)
          res = current as {
            statusCode: number;
            headers?: Record<string, string>;
            body?: unknown;
          };
        else res = { statusCode: 200, headers: {}, body: current };
        if (res.body !== undefined && typeof res.body !== 'string') {
          try {
            res.body = JSON.stringify(res.body);
          } catch {
            res.body = String(res.body);
          }
        }
        const headers = res.headers ?? {};
        headers['Content-Type'] = contentType;
        res.headers = headers;
        (request as unknown as { response: typeof res }).response = res;
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
  const onError: M[] = [makeErrorExpose(logger), makeErrorHandler(opts)];
  return { before, after, onError };
};

/** Public helper: build default phases suitable for replace scenarios. */
export type BuildSafeDefaultsArgs = Parameters<typeof buildDefaultPhases>[0];
export const buildSafeDefaults = (args: BuildSafeDefaultsArgs) =>
  buildDefaultPhases(args);
