/**
 * Handler: GET /users (search)
 *
 * - Event is typed via zod override in lambda.ts (queryStringParameters).
 * - Canonicalize name/phone via normstr.
 * - Use QueryBuilder to route by index; return 200 with items/pageKeyMap.
 */
import { createQueryBuilder } from '@karmaniverous/entity-client-dynamodb';
import { sort } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';

import type { UserItem } from '@/app/domain/user';
import { entityClient } from '@/app/entity/entityClient';

import { fn, responseSchema } from './lambda';

type Response = { items: UserItem[]; pageKeyMap?: string };

export const handler = fn.handler(
  async (event): Promise<Response> => {
    const q = event.queryStringParameters;

    // Canonicalize strings for search (case/diacritic/whitespace-insensitive)
    const name = normstr(q.name);
    const phone = normstr(q.phone);
    const beneficiaryId = q.beneficiaryId;
    const createdFrom = q.createdFrom;
    const createdTo = q.createdTo;
    const updatedFrom = q.updatedFrom;
    const updatedTo = q.updatedTo;
    const sortOrder: NonNullable<typeof q.sortOrder> =
      q.sortOrder ??
      (name ? 'name' : updatedFrom || updatedTo ? 'updated' : 'created');
    const sortDesc = q.sortDesc ?? false;

    // Determine hash key token (beneficiary-scoped vs global)
    const hashKeyToken = beneficiaryId
      ? ('beneficiaryHashKey' as const)
      : ('hashKey' as const);

    // Determine range key token routing from requested surface
    const rangeKeyTokens = phone
      ? (['phone'] as const)
      : sortOrder === 'created'
        ? (['created'] as const)
        : sortOrder === 'name'
          ? name
            ? (['firstNameRangeKey', 'lastNameRangeKey'] as const)
            : (['lastNameRangeKey'] as const)
          : (['updated'] as const);

    // Narrow index tokens with a small literal (improves pageKey typing; not required at runtime).
    const cf = {
      indexes: {
        created: { hashKey: 'hashKey', rangeKey: 'created' },
        firstName: { hashKey: 'hashKey', rangeKey: 'firstNameRangeKey' },
        lastName: { hashKey: 'hashKey', rangeKey: 'lastNameRangeKey' },
        phone: { hashKey: 'hashKey', rangeKey: 'phone' },
        updated: { hashKey: 'hashKey', rangeKey: 'updated' },
        userBeneficiaryCreated: {
          hashKey: 'beneficiaryHashKey',
          rangeKey: 'created',
        },
        userBeneficiaryFirstName: {
          hashKey: 'beneficiaryHashKey',
          rangeKey: 'firstNameRangeKey',
        },
        userBeneficiaryLastName: {
          hashKey: 'beneficiaryHashKey',
          rangeKey: 'lastNameRangeKey',
        },
        userBeneficiaryPhone: {
          hashKey: 'beneficiaryHashKey',
          rangeKey: 'phone',
        },
        userBeneficiaryUpdated: {
          hashKey: 'beneficiaryHashKey',
          rangeKey: 'updated',
        },
        userCreated: { hashKey: 'userHashKey', rangeKey: 'created' },
      },
    } as const;

    // Route map: (hashKeyToken, rangeKeyToken) -> index token
    const route = {
      hashKey: {
        created: 'created',
        firstNameRangeKey: 'firstName',
        lastNameRangeKey: 'lastName',
        phone: 'phone',
        updated: 'updated',
      },
      beneficiaryHashKey: {
        created: 'userBeneficiaryCreated',
        firstNameRangeKey: 'userBeneficiaryFirstName',
        lastNameRangeKey: 'userBeneficiaryLastName',
        phone: 'userBeneficiaryPhone',
        updated: 'userBeneficiaryUpdated',
      },
    } as const;

    // Build query across one or more indices
    let qb = createQueryBuilder({
      entityClient,
      entityToken: 'user',
      hashKeyToken,
      pageKeyMap: q.pageKeyMap,
      cf,
    });

    for (const rkt of rangeKeyTokens) {
      const idx = route[hashKeyToken][rkt];

      if (rkt === 'created') {
        qb = qb.addRangeKeyCondition(idx, {
          property: 'created',
          operator: 'between',
          value: { from: createdFrom, to: createdTo },
        });
      } else if (rkt === 'updated') {
        qb = qb.addRangeKeyCondition(idx, {
          property: 'updated',
          operator: 'between',
          value: { from: updatedFrom, to: updatedTo },
        });
      } else if (rkt === 'phone') {
        qb = qb.addRangeKeyCondition(idx, {
          property: 'phone',
          operator: 'begins_with',
          value: phone,
        });
      } else if (rkt === 'firstNameRangeKey') {
        qb = qb.addRangeKeyCondition(idx, {
          property: 'firstNameRangeKey',
          operator: 'begins_with',
          value: entityClient.entityManager.encodeGeneratedProperty(
            'firstNameRangeKey',
            {
              firstNameCanonical: name,
            },
          ),
        });
      } else if (rkt === 'lastNameRangeKey') {
        qb = qb.addRangeKeyCondition(idx, {
          property: 'lastNameRangeKey',
          operator: 'begins_with',
          value: entityClient.entityManager.encodeGeneratedProperty(
            'lastNameRangeKey',
            {
              lastNameCanonical: name,
            },
          ),
        });
      }

      // Supplemental filters if not covered by range conditions
      if ((createdFrom || createdTo) && rkt !== 'created') {
        qb = qb.addFilterCondition(idx, {
          property: 'created',
          operator: 'between',
          value: { from: createdFrom, to: createdTo },
        });
      }
      if (name && !['firstNameRangeKey', 'lastNameRangeKey'].includes(rkt)) {
        qb = qb.addFilterCondition(idx, {
          operator: 'or',
          conditions: [
            {
              property: 'firstNameCanonical',
              operator: 'begins_with',
              value: name,
            },
            {
              property: 'lastNameCanonical',
              operator: 'begins_with',
              value: name,
            },
          ],
        });
      }
      if ((updatedFrom || updatedTo) && rkt !== 'updated') {
        qb = qb.addFilterCondition(idx, {
          property: 'updated',
          operator: 'between',
          value: { from: updatedFrom, to: updatedTo },
        });
      }
    }

    const result = await qb.query({
      item: beneficiaryId ? { beneficiaryId } : {},
      timestampFrom: createdFrom,
      timestampTo: createdTo,
    });

    if (!result.items.length)
      return { items: [], pageKeyMap: result.pageKeyMap };

    const keys = entityClient.entityManager.getPrimaryKey('user', result.items);
    const { items } = await entityClient.getItems('user', keys);

    const sorted = sort(items, [
      {
        property: sortOrder === 'name' ? 'lastNameCanonical' : sortOrder,
        desc: sortDesc,
      },
    ]);

    const domain = entityClient.entityManager.removeKeys('user', sorted);
    return { items: domain, pageKeyMap: result.pageKeyMap };
  },
  { responseSchema },
);
