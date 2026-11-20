import httpContentNegotiation from '@middy/http-content-negotiation';
import httpCors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpResponseSerializer from '@middy/http-response-serializer';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { z } from 'zod';

import { asApiMiddleware } from '@/src/http/middleware/asApiMiddleware';
import { httpZodValidator } from '@/src/http/middleware/httpZodValidator';
import { shortCircuitHead } from '@/src/http/middleware/shortCircuitHead';
import { tagStep } from '@/src/http/middleware/transformUtils';
import { wrapSerializer } from '@/src/http/middleware/wrapSerializer';
import type { ConsoleLogger } from '@/src/types/Loggable';

import { makeJsonBodyParser, makeMultipartBodyParser } from './bodySteps';
import { makeErrorExpose, makeErrorHandler } from './errorSteps';
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
