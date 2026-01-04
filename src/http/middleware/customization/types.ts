/**
 * HTTP customization types and aliases.
 */
import type { MiddlewareObj } from '@middy/core';
import type httpContentNegotiation from '@middy/http-content-negotiation';
import type httpCors from '@middy/http-cors';
import type httpErrorHandler from '@middy/http-error-handler';
import type httpHeaderNormalizer from '@middy/http-header-normalizer';
import type httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import type {
  HttpTransform,
  PhasedArrays,
} from '@/src/http/middleware/transformUtils';
import type { ConsoleLogger } from '@/src/types/Loggable';

/** Alias for an API Gateway middleware object. */
export type ApiMiddleware = MiddlewareObj<APIGatewayProxyEvent, Context>;

/** Configuration options for the HTTP middleware stack. */
export type HttpStackOptions = {
  /** Content type to respond with (default: 'application/json'). */
  contentType?: string; // default 'application/json'
  /** Logger instance to use. */
  logger?: ConsoleLogger;
  /** Options for `http-content-negotiation`. */
  contentNegotiation?: Parameters<typeof httpContentNegotiation>[0];
  /** Options for `http-cors`. */
  cors?: Parameters<typeof httpCors>[0];
  /** Options for `http-error-handler`. */
  errorHandler?: Parameters<typeof httpErrorHandler>[0];
  /** Serializer configuration. */
  serializer?: {
    /** JSON serializer configuration. */
    json?: { label?: string; stringify?: (value: unknown) => string };
  };
  /** Options for `http-json-body-parser`. */
  jsonBodyParser?: Parameters<typeof httpJsonBodyParser>[0];
  /** Options for `http-header-normalizer`. */
  headerNormalizer?: Parameters<typeof httpHeaderNormalizer>[0];
};

/** Extension points for middleware phases. */
export type Extend = {
  /** Middleware to append to the 'before' phase. */
  before?: ApiMiddleware[];
  /** Middleware to append to the 'after' phase. */
  after?: ApiMiddleware[];
  /** Middleware to append to the 'onError' phase. */
  onError?: ApiMiddleware[];
};

/** Named HTTP configuration profile. */
export type HttpProfile = HttpStackOptions & {
  /** Middleware extensions. */
  extend?: Extend;
  /** Transformation function. */
  transform?: HttpTransform;
};

/** Application-level HTTP configuration. */
export type AppHttpConfig = {
  /** Default options and behavior. */
  defaults?: HttpStackOptions & { extend?: Extend; transform?: HttpTransform };
  /** Named profiles. */
  profiles?: Record<string, HttpProfile>;
};

/** Function-level HTTP configuration. */
export type FunctionHttpConfig = {
  /** Profile name to apply. */
  profile?: string;
  /** Option overrides. */
  options?: Partial<HttpStackOptions>;
  /** Middleware extensions. */
  extend?: Extend;
  /** Transformation function. */
  transform?: HttpTransform;
  /** Full stack replacement. */
  replace?: { stack: MiddlewareObj | PhasedArrays };
};
/** Optional Zod type used by step builders. */
export type Zodish = z.ZodType | undefined;
