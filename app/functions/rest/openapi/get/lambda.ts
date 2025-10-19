/**
 * Registration: GET /openapi (public)
 */

import { join } from 'node:path';

import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { APP_ROOT_ABS } from '@/app/config/app.config';

export const responseSchema = z.unknown();

export const fn = app.defineFunction({
  functionName: 'openapi_get',
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'openapi',
  contentType: 'application/json',
  eventSchema: undefined,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'rest').replace(/\\/g, '/'),
});

export type Response = z.infer<typeof responseSchema>;
