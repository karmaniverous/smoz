import {
  type ConfigInput,
  createEntityManager,
} from '@karmaniverous/entity-manager';
import { defaultTranscodes } from '@karmaniverous/entity-tools';

import { userSchema } from '@/app/domain/user';

/**
 * EntityManager configuration (values-first + schema-first).
 * - One entity ("user") with simple generated properties to enable
 *   tokenized indexes for name and created/updated queries.
 * - Hash/range tokens are declared explicitly to keep YAML/table
 *   composition deterministic.
 */
const config = {
  hashKey: 'hashKey' as const,
  rangeKey: 'rangeKey' as const,

  // Domain schemas by token
  entitiesSchema: {
    user: userSchema,
  } as const,

  // Per-entity metadata
  entities: {
    user: {
      uniqueProperty: 'userId',
      timestampProperty: 'created',
      // Sharding schedule omitted in v000 (no historical cross-shard),
      // may be introduced in later versions.
    },
  },

  // Generated properties drive alternate keys and name ordering
  generatedProperties: {
    sharded: {
      userHashKey: ['userId'] as const,
    },
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
    },
  } as const,

  // Minimal, pragmatic index set
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

  // Transcode mapping for domain properties
  propertyTranscodes: {
    userId: 'string',
    beneficiaryId: 'string',
    firstNameCanonical: 'string',
    lastNameCanonical: 'string',
    phone: 'string',
    created: 'timestamp',
    updated: 'timestamp',
  },
  transcodes: defaultTranscodes,
} satisfies ConfigInput;

export const entityManager = createEntityManager(config);
