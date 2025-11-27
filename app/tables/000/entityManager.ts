/**
 + REQUIREMENTS ADDRESSED
 + - Add a values‑first (as const) EntityManager config for version 000 that
 +   reuses the domain schema and preserves literal tokens for type inference.
 + - Provide a small but realistic index set (created/updated + name) suitable
 +   for simple CRUD/search in the /app fixture.
 */
import type { ConfigInput } from '@karmaniverous/entity-manager';
import { createEntityManager } from '@karmaniverous/entity-manager';
import { defaultTranscodes } from '@karmaniverous/entity-tools';

import { userSchema } from '@/app/domain/user';

// Minimal config literal. Keep tokens literal (as const) to preserve inference.
const config = {
  hashKey: 'hashKey' as const,
  rangeKey: 'rangeKey' as const,
  entitiesSchema: {
    user: userSchema,
  } as const,
  entities: {
    user: {
      uniqueProperty: 'userId',
      timestampProperty: 'created',
      // No sharding bumps for the fixture (keeps examples simple).
      shardBumps: [],
    },
  },
  generatedProperties: {
    sharded: {
      // Beneficiary/user hash keys for scoped/global queries.
      userHashKey: ['userId'] as const,
    } as const,
    unsharded: {
      firstNameRangeKey: [
        'firstNameCanonical',
        'lastNameCanonical',
        'created',
      ] as const,
      lastNameRangeKey: [
        'lastNameCanonical',
        'firstNameCanonical',
        'created',
      ] as const,
    } as const,
  } as const,
  // Small but useful index set for basic searches.
  indexes: {
    created: { hashKey: 'hashKey', rangeKey: 'created', projections: [] },
    updated: { hashKey: 'hashKey', rangeKey: 'updated', projections: [] },
    firstName: {
      hashKey: 'hashKey',
      rangeKey: 'firstNameRangeKey',
      projections: [],
    },
    lastName: {
      hashKey: 'hashKey',
      rangeKey: 'lastNameRangeKey',
      projections: [],
    },
    userCreated: {
      hashKey: 'userHashKey',
      rangeKey: 'created',
      projections: [],
    },
  } as const,
  // Map domain properties to transcodes used by the EM/Client.
  propertyTranscodes: {
    beneficiaryId: 'string',
    created: 'timestamp',
    firstName: 'string',
    firstNameCanonical: 'string',
    lastName: 'string',
    lastNameCanonical: 'string',
    phone: 'string',
    updated: 'timestamp',
    userId: 'string',
  },
  transcodes: defaultTranscodes,
} satisfies ConfigInput;

export const entityManager = createEntityManager(config, console);
export type ConfigMap = typeof config;
