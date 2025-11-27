/**
 * Registration: DELETE /users/{id}
 */
import { join } from 'node:path';

import { z } from 'zod';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';

export const eventSchema = z
  .object({
    pathParameters: z.object({ id: z.string() }),
  })
  .passthrough();

export const fn = app.defineFunction({
  eventType: 'rest',
  basePath: 'users/{id}',
  eventSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'rest').replace(/\\/g, '/'),
});
