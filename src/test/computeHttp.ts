/**
 * Shared harness for the computeHttpMiddleware tests: run a handler through the computed HTTP stack.
 */
import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import {
  type AppHttpConfig,
  computeHttpMiddleware,
  type FunctionHttpConfig,
} from '@/src/http/middleware/httpStackCustomization';
import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';

export type HttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export const run = async (
  base: (e: APIGatewayProxyEvent, c: Context) => Promise<unknown>,
  options: {
    app?: AppHttpConfig;
    fnDefaults?: FunctionHttpConfig;
    fn?: FunctionHttpConfig;
    eventSchema?: z.ZodType;
    responseSchema?: z.ZodType;
    contentType?: string;
    fnContentType?: string;
  },
  accept?: string,
): Promise<HttpResponse> => {
  const http = computeHttpMiddleware({
    functionName: 'testFn',
    logger: console,
    ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
    ...(options.responseSchema
      ? { responseSchema: options.responseSchema }
      : {}),
    ...(options.contentType ? { contentType: options.contentType } : {}),
    ...(options.fnContentType ? { fnContentType: options.fnContentType } : {}),
    ...(options.app ? { app: options.app } : {}),
    ...(options.fnDefaults ? { fnDefaults: options.fnDefaults } : {}),
    ...(options.fn ? { fn: options.fn } : {}),
  });
  const wrapped = middy(async (e: APIGatewayProxyEvent, c: Context) =>
    base(e, c),
  ).use(http);
  const evt = createApiGatewayV1Event('GET', {
    Accept: accept ?? 'application/json',
  });
  const ctx = createLambdaContext();
  return (await wrapped(evt, ctx)) as HttpResponse;
};
