/**
 * Registration: POST /users (create)
 * - Use body override so handler sees typed event.body.
 * - Do not set defaulted config options.
 */
import { join } from 'node:path';

import { z } from 'zod';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';
import { userSchema } from '@/app/domain/user';

// Body schema (domain inputs; generated/canonical fields omitted)
export const postBodySchema = z.object({
  beneficiaryId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  userId: z.string().optional(),
});

export const eventSchema = z
  .object({
    body: postBodySchema,
  })
  .passthrough();

export const responseSchema = userSchema;

export const fn = app.defineFunction({
  eventType: 'rest',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'rest').replace(/\\/g, '/'),
});

export type PostResponse = z.infer<typeof responseSchema>;
