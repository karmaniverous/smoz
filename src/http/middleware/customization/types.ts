/**
 * HTTP customization types and aliases.
 */
import type { MiddlewareObj } from '@middy/core';
import type httpContentNegotiation from '@middy/http-content-negotiation';
import type httpCors from '@middy/http-cors';
import type httpErrorHandler from '@middy/http-error-handler';
import type httpHeaderNormalizer from '@middy/http-header-normalizer';
import type httpJsonBodyParser from '@middy/http-json-body-parser';
import type httpMultipartBodyParser from '@middy/http-multipart-body-parser';
import type { z } from 'zod';

import type {
  ApiMiddleware,
  HttpTransform,
  PhasedArrays,
} from '@/src/http/middleware/transformUtils';
import type { ConsoleLogger } from '@/src/types/Loggable';

export type { ApiMiddleware };

export type HttpStackOptions = {
  contentType?: string; // default 'application/json'
  logger?: ConsoleLogger;
  contentNegotiation?: Parameters<typeof httpContentNegotiation>[0];
  cors?: Parameters<typeof httpCors>[0];
  errorHandler?: Parameters<typeof httpErrorHandler>[0];
  serializer?: {
    json?: { label?: string; stringify?: (value: unknown) => string };
  };
  jsonBodyParser?: Parameters<typeof httpJsonBodyParser>[0];
  /**
   * Opt-in `multipart/form-data` request body parsing via
   * `@middy/http-multipart-body-parser` (install it to use this option).
   *
   * - Omitted (default): no multipart parsing.
   * - Options object (`{}` for parser defaults): enables the
   *   `multipart-body-parser` step. Options pass through to the parser;
   *   `disableContentTypeError` defaults to `true` so non-multipart requests
   *   (e.g. JSON) reach the other parsers untouched.
   * - `false`: disables it, e.g. to opt a function out of a profile or app
   *   default that enables it.
   *
   * The parsed body is passed through unchanged; describe it in the
   * function's `eventSchema`.
   */
  multipartBodyParser?: Parameters<typeof httpMultipartBodyParser>[0] | false;
  headerNormalizer?: Parameters<typeof httpHeaderNormalizer>[0];
};

export type Extend = {
  before?: ApiMiddleware[];
  after?: ApiMiddleware[];
  onError?: ApiMiddleware[];
};

export type HttpProfile = HttpStackOptions & {
  extend?: Extend;
  transform?: HttpTransform;
};

export type AppHttpConfig = {
  defaults?: HttpStackOptions & { extend?: Extend; transform?: HttpTransform };
  profiles?: Record<string, HttpProfile>;
};

export type FunctionHttpConfig = {
  profile?: string;
  options?: Partial<HttpStackOptions>;
  extend?: Extend;
  transform?: HttpTransform;
  replace?: { stack: MiddlewareObj | PhasedArrays };
};
/** Optional Zod type used by step builders. */
export type Zodish = z.ZodType | undefined;
