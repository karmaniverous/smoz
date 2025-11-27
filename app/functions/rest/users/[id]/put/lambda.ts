/**
 * Registration: PUT /users/{id} (shallow update; null deletes optionals)
 */
import { join } from 'node:path';

import { z } from 'zod';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';
import { userSchema } from '@/app/domain/user';

export const putBodySchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.union([z.string(), z.null()]).optional(),
});

export const eventSchema = z
  .object({
    pathParameters: z.object({ id: z.string() }),
    body: putBodySchema,
  })
  .passthrough();

export const responseSchema = z.array(userSchema);

export const fn = app.defineFunction({
  eventType: 'rest',
  basePath: 'users/{id}',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'rest').replace(/\\/g, '/'),
});
