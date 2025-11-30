import { createQueryBuilder } from '@karmaniverous/entity-client-dynamodb';
import { sort } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';

import { entityClient } from '@/app/entity/entityClient';

import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  const entityToken = 'user' as const;

  const {
    beneficiaryId,
    createdFrom,
    createdTo,
    pageKeyMap,
    sortDesc = false,
    updatedFrom,
    updatedTo,
    ...q
  } = event.queryStringParameters;

  const name = normstr(q.name);
  const phone = normstr(q.phone);
  const sortOrder =
    q.sortOrder ??
    (name ? 'name' : updatedFrom || updatedTo ? 'updated' : 'created');

  // Determine hash key token (beneficiary-scoped vs global)
  const hashKeyToken = beneficiaryId ? 'beneficiaryHashKey' : 'hashKey';

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

  // Build query across one or more indices
  let queryBuilder = createQueryBuilder({
    entityClient,
    entityToken,
    hashKeyToken,
    pageKeyMap,
  });

  for (const rangeKeyToken of rangeKeyTokens) {
    const indexToken = entityClient.entityManager.findIndexToken(
      hashKeyToken,
      rangeKeyToken,
    );

    if (rangeKeyToken === 'created') {
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'created',
        operator: 'between',
        value: { from: createdFrom, to: createdTo },
      });
    } else if (rangeKeyToken === 'updated') {
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'updated',
        operator: 'between',
        value: { from: updatedFrom, to: updatedTo },
      });
    } else if (rangeKeyToken === 'phone') {
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'phone',
        operator: 'begins_with',
        value: phone!,
      });
    } else if (rangeKeyToken === 'firstNameRangeKey') {
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'firstNameRangeKey',
        operator: 'begins_with',
        value: entityClient.entityManager.encodeGeneratedProperty(
          'firstNameRangeKey',
          {
            firstNameCanonical: name,
          },
        ),
      });
    } else {
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
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
    if ((createdFrom || createdTo) && rangeKeyToken !== 'created') {
      queryBuilder = queryBuilder.addFilterCondition(indexToken, {
        property: 'created',
        operator: 'between',
        value: { from: createdFrom, to: createdTo },
      });
    }
    if (
      name &&
      !['firstNameRangeKey', 'lastNameRangeKey'].includes(rangeKeyToken)
    ) {
      queryBuilder = queryBuilder.addFilterCondition(indexToken, {
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
    if ((updatedFrom || updatedTo) && rangeKeyToken !== 'updated') {
      queryBuilder = queryBuilder.addFilterCondition(indexToken, {
        property: 'updated',
        operator: 'between',
        value: { from: updatedFrom, to: updatedTo },
      });
    }
  }

  const response = await queryBuilder.query({
    item: beneficiaryId ? { beneficiaryId } : {},
    timestampFrom: createdFrom,
    timestampTo: createdTo,
  });

  if (!response.items.length) return response;

  const keys = entityClient.entityManager.getPrimaryKey(
    entityToken,
    response.items,
  );

  const { items: enrichedItems } = await entityClient.getItems(
    entityToken,
    keys,
  );

  response.items = sort(enrichedItems, [
    {
      property: sortOrder === 'name' ? 'lastNameCanonical' : sortOrder,
      desc: sortDesc,
    },
  ]);

  return response;
});
