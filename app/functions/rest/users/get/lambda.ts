import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { userSchema } from '@/app/domain/user';
import { endpointsRootAbs } from '@/app/functions/rest/endpointsRootAbs';

export const eventSchema = z.object({
  queryStringParameters: z.object({
    beneficiaryId: z.string().optional(),
    createdFrom: z.coerce.number().optional(),
    createdTo: z.coerce.number().optional(),
    name: z.string().optional(),
    pageKeyMap: z.string().optional(),
    phone: z.string().optional(),
    // TODO: improve boolean coercion handling
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
  eventType: 'rest',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs,
});
