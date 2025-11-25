import { z } from 'zod';

/**
 * Authoritative User domain schema.
 * - Canonical name fields support case/diacritic-insensitive search.
 * - created/updated are Unix ms timestamps.
 * - phone is optional in the baseline domain.
 */
export const userSchema = z.object({
  userId: z.string(),
  beneficiaryId: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  firstNameCanonical: z.string(),
  lastNameCanonical: z.string(),
  phone: z.string().optional(),
  created: z.number(),
  updated: z.number(),
});

export type UserItem = z.infer<typeof userSchema>;
