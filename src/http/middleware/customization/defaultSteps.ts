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

import {
  makeOnErrorCors,
  makeOnErrorShape,
  shapeResponse,
} from './responseShaping';
import type { ApiMiddleware, HttpStackOptions, Zodish } from './types';

type M = ApiMiddleware;

export const makeHead = (): M => tagStep(shortCircuitHead, 'head');

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

/**
 * True when the request carries a body worth parsing: an event is present,
 * the method is not GET/HEAD, and the body is non-empty. Shared by the body
 * parser steps so they skip the same requests.
 */
const hasParsableBody = (request: unknown): boolean => {
  const event = (request as { event?: APIGatewayProxyEvent }).event;
  if (!event) return false;
  const method = (
    event.httpMethod ||
    (event as unknown as { requestContext?: { http?: { method?: string } } })
      .requestContext?.http?.method ||
    ''
  ).toUpperCase();
  if (method === 'GET' || method === 'HEAD') return false;
  return !!event.body;
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
    if (!hasParsableBody(request)) return;
    if (inner.before) await inner.before(request);
  };
  return tagStep(mw, 'json-body-parser');
};

/** Multipart parser options, i.e. the enabled form of the stack option. */
export type MultipartBodyParserOptions = Exclude<
  HttpStackOptions['multipartBodyParser'],
  false | undefined
>;

/**
 * Opt-in `multipart/form-data` body parser step.
 *
 * `@middy/http-multipart-body-parser` is an optional peer dependency, so it is
 * imported lazily on the first request that has a body: consumers who never
 * enable this step need not install it. The parsed body is passed through
 * unchanged (no reshaping); limits are left to the parser's own defaults and
 * any `busboy.limits` the caller supplies.
 *
 * The `.catch` is load-bearing: bundlers such as esbuild (used by the
 * Serverless Framework) fail the build on an unresolvable bare `import()`,
 * but leave it as a runtime import when the promise is handled. It also turns
 * a missing package into an actionable error instead of a bare
 * `ERR_MODULE_NOT_FOUND`.
 */
export const makeMultipartBodyParser = (
  options: MultipartBodyParserOptions,
): M => {
  let inner: Promise<M> | undefined;
  const load = (): Promise<M> =>
    (inner ??= import('@middy/http-multipart-body-parser')
      .then(({ default: httpMultipartBodyParser }) =>
        asApiMiddleware(
          httpMultipartBodyParser({
            disableContentTypeError: true,
            ...options,
          }),
        ),
      )
      .catch((cause: unknown) => {
        throw new Error(
          "multipartBodyParser is enabled but '@middy/http-multipart-body-parser' could not be loaded. Install it in your app.",
          { cause },
        );
      }));
  const mw: M = {};
  mw.before = async (request) => {
    if (!hasParsableBody(request)) return;
    const parser = await load();
    if (parser.before) await parser.before(request);
  };
  return tagStep(mw, 'multipart-body-parser');
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

export const makeErrorExpose = (): M =>
  tagStep(
    {
      onError: (request) => {
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
              ({ body }: { body?: unknown }) =>
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
  const multipart = opts?.multipartBodyParser;
  const before: M[] = [
    makeHead(),
    makeHeaderNormalizer(opts),
    makeEventNormalizer(),
    makeContentNegotiation(contentType, opts),
    makeJsonBodyParser(opts),
    ...(multipart ? [makeMultipartBodyParser(multipart)] : []),
    makeZodBefore(logger, eventSchema),
  ];
  const after: M[] = [
    makeHeadFinalize(contentType),
    makeZodAfter(logger, responseSchema),
    makeErrorExpose(),
    makeCors(opts),
    makePreferredMedia(contentType),
    makeShapeAndContentType(contentType),
    makeSerializer(contentType, opts),
  ];
  const onError: M[] = [
    makeErrorExpose(),
    makeErrorHandler(opts),
    // Post-error-handler processing: middy v6+ does not re-run the after
    // chain after onError, so CORS and response shaping must happen here.
    // Shape first so CORS can mutate a well-formed headers object.
    makeOnErrorShape(contentType),
    makeOnErrorCors(opts),
  ];
  return { before, after, onError };
};

/** Public helper: build default phases suitable for replace scenarios. */
export type BuildSafeDefaultsArgs = Parameters<typeof buildDefaultPhases>[0];
export const buildSafeDefaults = (args: BuildSafeDefaultsArgs) =>
  buildDefaultPhases(args);
