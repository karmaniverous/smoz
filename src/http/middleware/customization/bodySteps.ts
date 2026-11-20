/**
 * Body parser steps of the HTTP stack: `json-body-parser` and the opt-in
 * `multipart-body-parser`.
 *
 * @packageDocumentation
 */
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent } from 'aws-lambda';

import { asApiMiddleware } from '@/src/http/middleware/asApiMiddleware';
import { tagStep } from '@/src/http/middleware/transformUtils';

import type { ApiMiddleware, HttpStackOptions } from './types';

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

export const makeJsonBodyParser = (opts?: HttpStackOptions): ApiMiddleware => {
  const inner = asApiMiddleware(
    httpJsonBodyParser({
      disableContentTypeError: true,
      ...(opts?.jsonBodyParser ?? {}),
    }),
  );
  const mw: ApiMiddleware = {};
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
): ApiMiddleware => {
  let inner: Promise<ApiMiddleware> | undefined;
  const load = (): Promise<ApiMiddleware> =>
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
  const mw: ApiMiddleware = {};
  mw.before = async (request) => {
    if (!hasParsableBody(request)) return;
    const parser = await load();
    if (parser.before) await parser.before(request);
  };
  return tagStep(mw, 'multipart-body-parser');
};
