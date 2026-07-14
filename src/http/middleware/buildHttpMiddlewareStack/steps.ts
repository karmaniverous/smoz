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
import type { ApiMiddleware } from '@/src/http/middleware/customization/types';
import { httpZodValidator } from '@/src/http/middleware/httpZodValidator';
import { shortCircuitHead } from '@/src/http/middleware/shortCircuitHead';
import { wrapSerializer } from '@/src/http/middleware/wrapSerializer';
import type { ConsoleLogger } from '@/src/types/Loggable';

// Use the exported public alias so TypeDoc includes the type in docs.

export const makeHead = (): ApiMiddleware => shortCircuitHead as ApiMiddleware;

export const makeHeaderNormalizer = (): ApiMiddleware =>
  asApiMiddleware(httpHeaderNormalizer({ canonical: true }));

export const makeEventNormalizer = (): ApiMiddleware =>
  asApiMiddleware(httpEventNormalizer());

export const makeJsonBodyParser = (): ApiMiddleware => {
  // Conditional body parse (skip GET/HEAD; parse only when body present)
  const inner = asApiMiddleware(
    httpJsonBodyParser({ disableContentTypeError: true }),
  );
  const mw: ApiMiddleware = {
    before: async (request) => {
      const event = (request as unknown as { event?: APIGatewayProxyEvent })
        .event;
      if (!event) return;
      const method = (
        event.httpMethod ||
        (
          event as unknown as {
            requestContext?: { http?: { method?: string } };
          }
        ).requestContext?.http?.method ||
        ''
      ).toUpperCase();
      if (method === 'GET' || method === 'HEAD') return;
      if (!event.body) return;
      if (inner.before) await inner.before(request);
    },
  };
  return mw;
};

export const makeContentNegotiation = (contentType: string): ApiMiddleware =>
  asApiMiddleware(
    httpContentNegotiation({
      parseLanguages: false,
      parseCharsets: false,
      parseEncodings: false,
      availableMediaTypes: [contentType],
    }),
  );

export const makeZodValidator = (
  logger: ConsoleLogger,
  eventSchema?: z.ZodType,
  responseSchema?: z.ZodType,
): ApiMiddleware =>
  asApiMiddleware(
    httpZodValidator({
      logger,
      ...(eventSchema ? { eventSchema } : {}),
      ...(responseSchema ? { responseSchema } : {}),
    }),
  );

export const makePreferredMedia = (contentType: string): ApiMiddleware => ({
  before: (request) => {
    const req = request as { preferredMediaTypes?: string[] };
    if (!Array.isArray(req.preferredMediaTypes)) {
      req.preferredMediaTypes = [contentType];
    }
    const ri = request as { internal?: Record<string, unknown> };
    if (!ri.internal) ri.internal = {};
    const internal = ri.internal as { preferredMediaTypes?: string[] };
    if (!Array.isArray(internal.preferredMediaTypes)) {
      internal.preferredMediaTypes = [contentType];
    }
  },
  after: (request) => {
    const req = request as { preferredMediaTypes?: string[] };
    if (!Array.isArray(req.preferredMediaTypes)) {
      req.preferredMediaTypes = [contentType];
    }
  },
  onError: (request) => {
    const req = request as { preferredMediaTypes?: string[] };
    if (!Array.isArray(req.preferredMediaTypes)) {
      req.preferredMediaTypes = [contentType];
    }
  },
});

export const makeHeadFinalize = (contentType: string): ApiMiddleware => ({
  after: (request) => {
    const evt = (request as unknown as { event?: APIGatewayProxyEvent }).event;
    if (!evt) return;
    const method = (
      evt.httpMethod ||
      (evt as unknown as { requestContext?: { http?: { method?: string } } })
        .requestContext?.http?.method ||
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
});

export const makeShapeAndContentType = (
  contentType: string,
): ApiMiddleware => ({
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
    if (looksShaped) {
      res = current as {
        statusCode: number;
        headers?: Record<string, string>;
        body?: unknown;
      };
    } else {
      res = { statusCode: 200, headers: {}, body: current };
    }

    // Ensure body is a string so the serializer won't 415
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
});

export const makeErrorExposure = (logger: ConsoleLogger): ApiMiddleware => ({
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
});

export const makeErrorHandler = (logger: ConsoleLogger): ApiMiddleware =>
  asApiMiddleware(
    httpErrorHandler({
      logger: (o) => {
        if (typeof logger.error === 'function') logger.error(o);
      },
    }),
  );

export const makeCors = (): ApiMiddleware =>
  asApiMiddleware(
    httpCors({
      credentials: true,
      // preserve computed origin
      getOrigin: (o) => o,
    }),
  );

export const makeResponseSerializer = (
  contentType: string,
  logger: ConsoleLogger,
): ApiMiddleware =>
  asApiMiddleware(
    httpResponseSerializer({
      serializers: [
        {
          // Accept application/json and application/*+json
          regex: /^application\/(?:[a-z0-9.+-]*\+)?json$/i,
          serializer: wrapSerializer(
            ({ body }) => {
              return typeof body === 'string' ? body : JSON.stringify(body);
            },
            {
              label: 'json',
              logger,
            },
          ),
        },
      ],
      defaultContentType: contentType,
    }),
  );
