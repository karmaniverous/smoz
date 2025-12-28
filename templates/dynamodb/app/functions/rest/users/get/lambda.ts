/**
 * Registration: GET /users (search)
 */
import { z } from 'zod';

import { app, ENDPOINTS_ROOT_REST } from '@/app/config/app.config';
import { userSchema } from '@/app/domain/user';

export const eventSchema = z.object({
  queryStringParameters: z.object({
    beneficiaryId: z.string().optional(),
    createdFrom: z.coerce.number().optional(),
    createdTo: z.coerce.number().optional(),
    name: z.string().optional(),
    pageKeyMap: z.string().optional(),
    phone: z.string().optional(),
    // TODO: improve boolean coercion handling (strings like "false")
    sortDesc: z.coerce.boolean().optional(),
    sortOrder: z.enum(['created', 'name', 'updated']).optional(),
    updatedFrom: z.coerce.number().optional(),
    updatedTo: z.coerce.number().optional(),
  }),
});

export const responseSchema = z.object({
  items: z.array(userSchema),
  pageKeyMap: z.string().optional(),
});

export const fn = app.defineFunction({
  functionName: 'users_get',
  eventType: 'rest',
  httpContexts: ['public'],
  method: 'get',
  basePath: 'users',
  contentType: 'application/json',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  restRootAbs: ENDPOINTS_ROOT_REST,
});

export type Response = z.infer<typeof responseSchema>;
