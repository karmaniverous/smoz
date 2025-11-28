import type { EntityClientRecordByToken } from '@karmaniverous/entity-manager';
import { z } from 'zod';

import { entityClient } from '../entity-manager/entityClient';

/**
 * User domain schema (base fields only).
 *
 * This schema excludes all generated/global keys. Those are derived from this
 * base shape by Entity Manager according to the config. Handlers can rely on
 * domain types for input/output and only materialize keys when interacting
 * with the database.
 */
export const userSchema = z.object({
  beneficiaryId: z.string().nullable().optional(),
  created: z.number(),
  firstName: z.string().nullable().optional(),
  firstNameCanonical: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  lastNameCanonical: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  updated: z.number(),
  userId: z.string(),
});

export type UserItem = z.infer<typeof userSchema>;

export type UserRecord = EntityClientRecordByToken<typeof entityClient, 'user'>;
