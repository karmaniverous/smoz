import { join } from 'node:path';

import { toPosixPath } from '@karmaniverous/smoz';
import { z } from 'zod';

import { app, appRootAbs } from '@/app/config/app.config';

export const eventSchema = z.any().optional();
export const responseSchema = z.unknown();

type FnApi = {
  handler: <T>(
    impl: () => Promise<T> | T,
  ) => (...args: unknown[]) => Promise<T>;
  openapi: (op: unknown) => void;
};

export const fn = app.defineFunction({
  functionName: 'openapi_get',
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'openapi',
  contentType: 'application/json',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  restRootAbs: toPosixPath(join(appRootAbs, 'functions', 'rest')),
}) as unknown as FnApi;
