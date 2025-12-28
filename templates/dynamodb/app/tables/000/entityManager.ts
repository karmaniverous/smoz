import type { ConfigInput } from '@karmaniverous/entity-manager';
import { createEntityManager } from '@karmaniverous/entity-manager';
import { defaultTranscodes } from '@karmaniverous/entity-tools';

import { userSchema } from '@/app/domain/user';

// Minimal config literal. Keep tokens literal (as const) to preserve inference.
export const entityManagerConfig = {
  hashKey: 'hashKey' as const,
  rangeKey: 'rangeKey' as const,
  entitiesSchema: {
    user: userSchema,
  } as const,
  entities: {
    user: {
      uniqueProperty: 'userId',
      timestampProperty: 'created',
    },
  },
  generatedProperties: {
    sharded: {
      beneficiaryHashKey: ['beneficiaryId'] as const,
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
    userCreated: { hashKey: 'hashKey', rangeKey: 'created' },
    userFirstName: {
      hashKey: 'hashKey',
      rangeKey: 'firstNameRangeKey',
    },
    userLastName: {
      hashKey: 'hashKey',
      rangeKey: 'lastNameRangeKey',
    },
    userPhone: {
      hashKey: 'hashKey',
      rangeKey: 'phone',
    },
    userUpdated: { hashKey: 'hashKey', rangeKey: 'updated' },
    beneficiaryCreated: { hashKey: 'beneficiaryHashKey', rangeKey: 'created' },
    beneficiaryFirstName: {
      hashKey: 'beneficiaryHashKey',
      rangeKey: 'firstNameRangeKey',
    },
    beneficiaryLastName: {
      hashKey: 'beneficiaryHashKey',
      rangeKey: 'lastNameRangeKey',
    },
    beneficiaryPhone: {
      hashKey: 'beneficiaryHashKey',
      rangeKey: 'phone',
    },
    beneficiaryUpdated: { hashKey: 'beneficiaryHashKey', rangeKey: 'updated' },
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

export const entityManager = createEntityManager(entityManagerConfig, console);
