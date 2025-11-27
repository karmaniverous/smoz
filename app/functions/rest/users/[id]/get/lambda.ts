/**
 * Registration: GET /users/{id}
 * - Explicit basePath to normalize path parameter template.
 */
import { join } from 'node:path';

import { z } from 'zod';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';
import { userSchema } from '@/app/domain/user';

export const eventSchema = z
  .object({
    pathParameters: z.object({ id: z.string() }),
  })
  .passthrough();

export const responseSchema = z.object({
  items: z.array(userSchema),
});

export const fn = app.defineFunction({
  eventType: 'rest',
  basePath: 'users/{id}',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'rest').replace(/\\/g, '/'),
});

export type GetByIdResponse = z.infer<typeof responseSchema>;
