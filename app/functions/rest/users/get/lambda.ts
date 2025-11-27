/**
 * Registration: GET /users (search)
 *
 * Requirements addressed:
 * - Use zod overrides so fn.handler receives a typed event (no in-handler casts).
 * - Do not populate config with defaults (method/basePath inferred from folder; contentType default).
 */
import { join } from 'node:path';

import { z } from 'zod';

import { app, APP_ROOT_ABS } from '@/app/config/app.config';
import { userSchema } from '@/app/domain/user';

// Typed querystring surface (coerce numeric/boolean)
export const searchQuerySchema = z.object({
  beneficiaryId: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  createdFrom: z.coerce.number().optional(),
  createdTo: z.coerce.number().optional(),
  updatedFrom: z.coerce.number().optional(),
  updatedTo: z.coerce.number().optional(),
  sortOrder: z.enum(['created', 'name', 'updated']).optional(),
  sortDesc: z.coerce.boolean().optional(),
  pageKeyMap: z.string().optional(),
});

// Event schema: override only queryStringParameters; allow passthrough of others.
export const eventSchema = z.object({
  queryStringParameters: searchQuerySchema,
});

export const responseSchema = z.object({
  items: z.array(userSchema),
  pageKeyMap: z.string().optional(),
});

export const fn = app.defineFunction({
  // Do not set defaults; method/basePath inferred from folder structure.
  // eventType is required.
  eventType: 'rest',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: join(APP_ROOT_ABS, 'functions', 'rest').replace(/\\/g, '/'),
});

export type SearchResponse = z.infer<typeof responseSchema>;
