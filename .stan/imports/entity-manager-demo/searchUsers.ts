/**
 * User search: flexible search across multiple indexes.
 *
 * Highlights:
 * - Beneficiary-scoped vs global (hash key token)
 * - Name search routes to first/last name indexes
 * - Optional phone and created/updated time ranges
 */
import { createQueryBuilder } from '@karmaniverous/entity-client-dynamodb';
import { sort } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';

import { entityClient } from '../../entity-manager/entityClient';
import type { UserItem } from '../../entity-manager/User';

/**
 * Parameters for the {@link searchUsers | `searchUsers`} function.
 *
 * @category User
 */
export interface SearchUsersParams {
  /** Unique id of related Beneficiary record. */
  beneficiaryId?: UserItem['beneficiaryId'];

  /** Unix ms timestamp of earliest `created` value. */
  createdFrom?: UserItem['created'];

  /** Unix ms timestamp of latest `created` value. */
  createdTo?: UserItem['created'];

  /** First characters of either first or last name. Case, whitespace & diacritic insensitive. */
  name?: string;

  /** Page key map from previous search page. */
  pageKeyMap?: string;

  /** First characters of phone number. Case, whitespace & diacritic insensitive. */
  phone?: UserItem['phone'];

  /** Sort results in descending order if `true`. */
  sortDesc?: boolean;

  /** Sort order of results. Default reflects search params, `created` if none. */
  sortOrder?: 'created' | 'name' | 'updated';

  /** Unix ms timestamp of earliest `updated` value. */
  updatedFrom?: UserItem['updated'];

  /** Unix ms timestamp of latest `updated` value. */
  updatedTo?: UserItem['updated'];
}

/**
 * Search for User records in the database.
 *
 * @category User
 */
export const searchUsers = async (params: SearchUsersParams) => {
  const entityToken = 'user';

  // Extract params.
  const {
    beneficiaryId,
    createdFrom,
    createdTo,
    pageKeyMap,
    sortDesc,
    updatedFrom,
    updatedTo,
  } = params;

  const name = normstr(params.name);
  const phone = normstr(params.phone);

  // Default sort order.
  const sortOrder: NonNullable<typeof params.sortOrder> =
    params.sortOrder ??
    (name ? 'name' : updatedFrom || updatedTo ? 'updated' : 'created');

  // Determine hash key token.
  const hashKeyToken = beneficiaryId ? 'beneficiaryHashKey' : 'hashKey';

  // Determine range key tokens.
  const rangeKeyTokens = phone
    ? ['phone']
    : sortOrder === 'created'
      ? ['created']
      : sortOrder === 'name'
        ? name
          ? ['firstNameRangeKey', 'lastNameRangeKey']
          : ['lastNameRangeKey']
        : ['updated'];

  // CF literal for index-token narrowing (optional DX sugar).
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

  // Route map: (hashKeyToken, rangeKeyToken) -> index token.
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

  // Create a query builder (ET inferred; ITS from cf).
  let queryBuilder = createQueryBuilder({
    entityClient,
    entityToken,
    hashKeyToken,
    pageKeyMap,
    cf,
  });

  // Iterate over range key tokens and add conditions per-index.
  for (const rangeKeyToken of rangeKeyTokens) {
    const indexToken =
      route[hashKeyToken][rangeKeyToken as keyof (typeof route)['hashKey']];

    // Add a range key condition.
    if (rangeKeyToken === 'created')
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'created',
        operator: 'between',
        value: { from: createdFrom, to: createdTo },
      });
    else if (rangeKeyToken === 'firstNameRangeKey')
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'firstNameRangeKey',
        operator: 'begins_with',
        value: entityClient.entityManager.encodeGeneratedProperty(
          'firstNameRangeKey',
          { firstNameCanonical: name },
        ),
      });
    else if (rangeKeyToken === 'lastNameRangeKey')
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'lastNameRangeKey',
        operator: 'begins_with',
        value: entityClient.entityManager.encodeGeneratedProperty(
          'lastNameRangeKey',
          { lastNameCanonical: name },
        ),
      });
    else if (rangeKeyToken === 'phone')
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'phone',
        operator: 'begins_with',
        value: phone,
      });
    else if (rangeKeyToken === 'updated')
      queryBuilder = queryBuilder.addRangeKeyCondition(indexToken, {
        property: 'updated',
        operator: 'between',
        value: { from: updatedFrom, to: updatedTo },
      });
    else throw new Error(`Unsupported range key token '${rangeKeyToken}'.`);

    // Add created filter condition if not covered by range key condition.
    if ((createdFrom || createdTo) && rangeKeyToken !== 'created')
      queryBuilder = queryBuilder.addFilterCondition(indexToken, {
        property: 'created',
        operator: 'between',
        value: { from: createdFrom, to: createdTo },
      });

    // Add name filter condition if not covered by range key condition.
    if (
      name &&
      !['firstNameRangeKey', 'lastNameRangeKey'].includes(rangeKeyToken)
    )
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

    // Add updated filter condition if not covered by range key condition.
    if ((updatedFrom || updatedTo) && rangeKeyToken !== 'updated')
      queryBuilder = queryBuilder.addFilterCondition(indexToken, {
        property: 'updated',
        operator: 'between',
        value: { from: updatedFrom, to: updatedTo },
      });
  }

  // Query database.
  const result = await queryBuilder.query({
    // Provide a partial item; empty when beneficiaryId is not provided.
    item: beneficiaryId ? { beneficiaryId } : {},
    timestampFrom: createdFrom,
    timestampTo: createdTo,
  });

  // Return empty result if no items found.
  if (!result.items.length) return result;

  // Extract result keys.
  const keys = entityClient.entityManager.getPrimaryKey(
    entityToken,
    result.items,
  );

  // Enrich result items.
  const { items } = await entityClient.getItems(keys);

  // Sort enriched items on domain properties.
  const sortedItems = sort(items, [
    {
      property: sortOrder === 'name' ? 'lastNameCanonical' : sortOrder,
      desc: sortDesc,
    },
  ]);

  // Remove keys & re-integrate with result.
  result.items = entityClient.entityManager.removeKeys(
    entityToken,
    sortedItems,
  );

  return result;
};
