/**
 + REQUIREMENTS ADDRESSED
 + - Provide an authoritative domain Zod schema for the /app fixture (User).
 + - Keep generated/global keys out of the domain shape; EntityManager derives
 +   storage keys from this schema.
 + - Reuse this schema across EntityManager and HTTP endpoints.
 */
import { z } from 'zod';

/**
 * User domain schema (base fields only).
 *
 * Notes:
 * - Canonical name forms support case/diacritic-insensitive search.
 * - Optional phone number is included for simple queries.
 */
export const userSchema = z.object({
  beneficiaryId: z.string(),
  created: z.number(),
  firstName: z.string(),
  firstNameCanonical: z.string(),
  lastName: z.string(),
  lastNameCanonical: z.string(),
  phone: z.string().optional(),
  updated: z.number(),
  userId: z.string(),
});

export type UserItem = z.infer<typeof userSchema>;
