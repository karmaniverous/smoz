/**
 * Shared harness for the defineFunction tests: a test app over the base
 * event map, and helpers to read its Serverless output and call handlers.
 */
import { pathToFileURL } from 'node:url';

import { z } from 'zod';

import { App } from '@/src/core/App';
import type { AppInit } from '@/src/core/AppInit';
import { baseEventTypeMapSchema } from '@/src/core/baseEventTypeMapSchema';
import type { FunctionDefaults } from '@/src/core/functionOptions';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';
import type { HttpResponse } from '@/src/test/http';
import {
  formParts,
  multipartBody,
  multipartContentType,
} from '@/src/test/multipart';

export const appRoot =
  process.platform === 'win32' ? 'C:/tmp/sandbox/app' : '/tmp/sandbox/app';

/** File URL of a lambda module at `<appRoot>/<rel>/lambda.ts`. */
export const at = (rel: string) =>
  pathToFileURL(`${appRoot}/${rel}/lambda.ts`).href;

export const globalParamsSchema = z.object({ REGION: z.string() });
export const stageParamsSchema = z.object({ STAGE: z.string() });
export const eventTypeMapSchema = baseEventTypeMapSchema.extend({
  custom: z.unknown(),
});

/** Env keys of the test app's params. */
export type TestEnvKey = 'REGION' | 'STAGE';

export const makeApp = (
  extra: {
    appRootAbs?: string;
    functionDefaults?: FunctionDefaults<TestEnvKey>;
    http?: AppHttpConfig;
  } = {},
) =>
  App.create({
    appRootAbs: appRoot,
    globalParamsSchema,
    stageParamsSchema,
    eventTypeMapSchema,
    serverless: {
      httpContextEventMap: {
        my: { authorizer: { name: 'auth' } },
        private: { private: true },
        public: {},
      },
      defaultHandlerFileName: 'handler',
      defaultHandlerFileExport: 'handler',
    },
    global: { params: { REGION: 'us-east-1' }, envKeys: [] },
    stage: { params: { dev: { STAGE: 'dev' } }, envKeys: [] },
    ...extra,
  } satisfies AppInit<
    typeof globalParamsSchema,
    typeof stageParamsSchema,
    typeof eventTypeMapSchema,
    never,
    never,
    TestEnvKey
  >);

export type FnOut = {
  handler: string;
  events: { http?: Record<string, unknown> }[];
  environment: Record<string, string>;
};
export const fnsOf = (app: ReturnType<typeof makeApp>) =>
  app.buildAllServerlessFunctions() as unknown as Record<string, FnOut>;

export const httpEvents = (fn: FnOut | undefined) =>
  (fn?.events ?? []).map(
    (e) => `${String(e.http?.method)} ${String(e.http?.path)}`,
  );

export const call = async (
  handler: (e: unknown, c: unknown) => Promise<unknown>,
  init: { method?: string; headers?: Record<string, string>; body?: string },
) => {
  const evt = createApiGatewayV1Event(init.method ?? 'GET', {
    Accept: 'application/json',
    ...init.headers,
  });
  if (init.body !== undefined) evt.body = init.body;
  return (await handler(evt, createLambdaContext())) as HttpResponse;
};

/** POST a multipart form; returns what the handler saw as `body.name` (or the raw body). */
export const postForm = async (
  handler: (e: unknown, c: unknown) => Promise<unknown>,
) => {
  const res = await call(handler, {
    method: 'POST',
    headers: { 'Content-Type': multipartContentType },
    body: multipartBody(formParts),
  });
  return JSON.parse(res.body) as { parsed: boolean };
};

/** Business handler reporting whether the body arrived parsed. */
export const sawParsedBody = async (event: unknown) => {
  const body = (event as { body?: unknown }).body;
  return {
    parsed:
      typeof body === 'object' &&
      (body as Record<string, unknown> | null)?.name === 'Aris',
  };
};
