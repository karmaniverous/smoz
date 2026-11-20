/**
 * Shared harness for the multipart body parser tests: run a request through the HTTP stack.
 */
import middy from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';

import type { HttpStackOptions } from '@/src/http/middleware/customization/types';
import {
  type AppHttpConfig,
  buildSafeDefaults,
  computeHttpMiddleware,
  type FunctionHttpConfig,
} from '@/src/http/middleware/httpStackCustomization';
import { getId } from '@/src/http/middleware/transformUtils';
import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';

export type HttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

/**
 * Run a request through the computed stack; returns the response and the body
 * the handler saw.
 */
export const run = async (args: {
  method?: string;
  contentType: string;
  body: string;
  isBase64Encoded?: boolean;
  app?: AppHttpConfig;
  fn?: FunctionHttpConfig;
}): Promise<{ res: HttpResponse; seen: unknown }> => {
  let seen: unknown;
  const http = computeHttpMiddleware({
    functionName: 'multipartFn',
    logger: { ...console, error: () => undefined },
    ...(args.app ? { app: args.app } : {}),
    ...(args.fn ? { fn: args.fn } : {}),
  });
  const wrapped = middy(async (e: APIGatewayProxyEvent) => {
    seen = e.body;
    return { ok: true };
  }).use(http);
  const evt = createApiGatewayV1Event(args.method ?? 'POST', {
    Accept: 'application/json',
    'Content-Type': args.contentType,
  });
  evt.body = args.body;
  evt.isBase64Encoded = args.isBase64Encoded ?? false;
  const res = (await wrapped(
    evt,
    createLambdaContext(),
  )) as unknown as HttpResponse;
  return { res, seen };
};

export const beforeIds = (opts: HttpStackOptions) =>
  buildSafeDefaults({
    contentType: 'application/json',
    logger: console,
    opts,
  }).before.map(getId);
