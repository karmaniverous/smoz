import type { EntityClientRecordByToken } from '@karmaniverous/entity-manager';
import { z } from 'zod';

import type { entityClient } from '@/app/entity/entityClient';

/**
 * User domain schema (base fields only).
 *
 * Notes:
 * - Canonical name forms support case/diacritic-insensitive search.
 * - Optional phone number is included for simple queries.
 */
export const userSchema = z.object({
  beneficiaryId: z.string().nullable().optional(),
  created: z.coerce.number(),
  firstName: z.string().nullable().optional(),
  firstNameCanonical: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  lastNameCanonical: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  updated: z.coerce.number(),
  userId: z.string(),
});

export type UserItem = z.infer<typeof userSchema>;

export type UserRecord = EntityClientRecordByToken<typeof entityClient, 'user'>;
