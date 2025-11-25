import type { ConfigInput } from '@karmaniverous/entity-manager';
import { createEntityManager } from '@karmaniverous/entity-manager';
import { defaultTranscodes } from '@karmaniverous/entity-tools';

import { errorLogger } from '../util/logger';
import { emailSchema } from './Email';
import { userSchema } from './User';

/**
 * EntityManager configuration (values-first + schema-first).
 *
 * Highlights:
 * - Entities Email and User are declared with Zod schemas; types are inferred.
 * - Generated properties (sharded/unsharded) are declared using string tokens.
 * - Index tokens match handler usage and drive typed query/page-keys.
 * - Transcodes map domain types to lexicographically sortable strings.
 *
 * The “values-first” literal (as const) preserves literal tokens at the type
 * level, which unlocks great inference across the stack (no casts, no generics
 * at call sites).
 *
 * The sharding schedule uses “now” as a breakpoint so that new data is sharded
 * while historical data remains unsharded — useful to demonstrate cross-shard
 * behavior deterministically in tests.
 *
 * See src/handlers/* for how this config is consumed via QueryBuilder and how
 * results are deduped/sorted on domain properties.
 */
// Current timestamp will act as break point for sharding schedule.
const now = Date.now();

// Config object for EntityManager.
const config = {
  hashKey: 'hashKey' as const,
  rangeKey: 'rangeKey' as const,
  entitiesSchema: {
    email: emailSchema,
    user: userSchema,
  } as const,

  entities: {
    email: {
      uniqueProperty: 'email',
      timestampProperty: 'created',
      shardBumps: [{ timestamp: now, charBits: 2, chars: 1 }],
    },
    user: {
      uniqueProperty: 'userId',
      timestampProperty: 'created',
      shardBumps: [{ timestamp: now, charBits: 2, chars: 1 }],
    },
  },
  generatedProperties: {
    sharded: {
      beneficiaryHashKey: ['beneficiaryId'] as const,
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
  indexes: {
    created: { hashKey: 'hashKey', rangeKey: 'created', projections: [] },
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
    phone: { hashKey: 'hashKey', rangeKey: 'phone', projections: [] },
    updated: { hashKey: 'hashKey', rangeKey: 'updated', projections: [] },
    userBeneficiaryCreated: {
      hashKey: 'beneficiaryHashKey',
      rangeKey: 'created',
      projections: [],
    },
    userBeneficiaryFirstName: {
      hashKey: 'beneficiaryHashKey',
      rangeKey: 'firstNameRangeKey',
      projections: [],
    },
    userBeneficiaryLastName: {
      hashKey: 'beneficiaryHashKey',
      rangeKey: 'lastNameRangeKey',
      projections: [],
    },
    userBeneficiaryPhone: {
      hashKey: 'beneficiaryHashKey',
      rangeKey: 'phone',
      projections: [],
    },
    userBeneficiaryUpdated: {
      hashKey: 'beneficiaryHashKey',
      rangeKey: 'updated',
      projections: [],
    },
    userCreated: {
      hashKey: 'userHashKey',
      rangeKey: 'created',
      projections: [],
    },
  } as const,
  propertyTranscodes: {
    beneficiaryId: 'string',
    created: 'timestamp',
    email: 'string',
    firstNameCanonical: 'string',
    lastNameCanonical: 'string',
    phone: 'string',
    updated: 'timestamp',
    userId: 'string',
  },
  transcodes: defaultTranscodes,
} satisfies ConfigInput;

// Configure & export EntityManager instance.
export const entityManager = createEntityManager(config, errorLogger);
