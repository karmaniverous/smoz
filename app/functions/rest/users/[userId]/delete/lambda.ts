import { z } from 'zod';

import { app } from '@/app/config/app.config';
import { userSchema } from '@/app/domain/user';
import { restRootAbs } from '@/app/functions/rest/restRootAbs';

export const eventSchema = z.object({
  pathParameters: userSchema.pick({ userId: true }),
});

export const fn = app.defineFunction({
  eventType: 'rest',
  eventSchema,
  callerModuleUrl: import.meta.url,
  restRootAbs,
});
