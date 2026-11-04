import { z } from 'zod';

import { app } from '@/app/config/app.config';

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
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
}) as unknown as FnApi;
