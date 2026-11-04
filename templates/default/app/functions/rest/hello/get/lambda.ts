import { z } from 'zod';

import { app } from '@/app/config/app.config';

export const eventSchema = z.object({}).optional();
export const responseSchema = z.object({ ok: z.boolean() });
type FnApi = {
  handler: <T>(
    impl: () => Promise<T> | T,
  ) => (...args: unknown[]) => Promise<T>;
  openapi: (op: unknown) => void;
};

export const fn = app.defineFunction({
  functionName: 'hello_get',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
}) as unknown as FnApi;
