import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { userSchema } from '@/app/domain/user';
import { restRootAbs } from '@/app/functions/rest/restRootAbs';

export const eventSchema = z.object({
  body: userSchema.pick({
    beneficiaryId: true,
    firstName: true,
    lastName: true,
    phone: true,
  }),
});

export const responseSchema = userSchema;

export const fn = app.defineFunction({
  eventType: 'rest',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  restRootAbs,
});
