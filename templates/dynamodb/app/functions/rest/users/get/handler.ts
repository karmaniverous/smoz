import { createQueryBuilder } from '@karmaniverous/entity-client-dynamodb';
import { sort } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';
import type { z } from 'zod';

import type { userSchema } from '@/app/domain/user';
import { entityClient } from '@/app/entity/entityClient';

import type { responseSchema } from './lambda';
import { fn } from './lambda';

type Response = z.infer<typeof responseSchema>;
type UserItem = z.infer<typeof userSchema>;

type FnHandlerApi<T> = {
  handler: (impl: () => Promise<T> | T) => (...args: unknown[]) => Promise<T>;
};

const reg = fn as unknown as FnHandlerApi<Response>;

export const handler = reg.handler(async () => {
  // Read query params from process.env via dev/inline mapping is out of scope here;
  // in production, SMOZ runtime maps API Gateway query params into the event.
  // For a template baseline, default to an empty search and return [].
  // If you adapt this handler, parse from your event/request mapping as needed.

  // Extractable knobs (defaults reflect typical list use cases)
  const beneficiaryId = undefined as UserItem['beneficiaryId'] | undefined;
  const createdFrom = undefined as number | undefined;
  const createdTo = undefined as number | undefined;
  const updatedFrom = undefined as number | undefined;
  const updatedTo = undefined as number | undefined;
  const name = undefined as string | undefined;
  const phone = undefined as string | undefined;
  const sortDesc = false;
  const sortOrder: 'created' | 'name' | 'updated' =
    (name ? 'name' : updatedFrom || updatedTo ? 'updated' : 'created') ??
    'created';
  const pageKeyMap = undefined as string | undefined;

  const normName = normstr(name);
  const normPhone = normstr(phone);

  const entityToken = 'user' as const;
  const hashKeyToken = beneficiaryId ? 'beneficiaryHashKey' : 'hashKey';
  const rangeKeyTokens = normPhone
    ? (['phone'] as const)
    : sortOrder === 'created'
      ? (['created'] as const)
      : sortOrder === 'name'
        ? normName
          ? (['firstNameRangeKey', 'lastNameRangeKey'] as const)
          : (['lastNameRangeKey'] as const)
        : (['updated'] as const);

  // CF literal narrows index tokens for page keys and compile-time routes.
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

  let qb = createQueryBuilder({
    entityClient,
    entityToken,
    hashKeyToken,
    pageKeyMap,
    cf,
  });

  for (const rangeKeyToken of rangeKeyTokens) {
    const indexToken = route[hashKeyToken][rangeKeyToken];

    if (rangeKeyToken === 'created')
      qb = qb.addRangeKeyCondition(indexToken, {
        property: 'created',
        operator: 'between',
        value: { from: createdFrom, to: createdTo },
      });
    else if (rangeKeyToken === 'firstNameRangeKey')
      qb = qb.addRangeKeyCondition(indexToken, {
        property: 'firstNameRangeKey',
        operator: 'begins_with',
        value: entityClient.entityManager.encodeGeneratedProperty(
          'firstNameRangeKey',
          { firstNameCanonical: normName },
        ),
      });
    else if (rangeKeyToken === 'lastNameRangeKey')
      qb = qb.addRangeKeyCondition(indexToken, {
        property: 'lastNameRangeKey',
        operator: 'begins_with',
        value: entityClient.entityManager.encodeGeneratedProperty(
          'lastNameRangeKey',
          { lastNameCanonical: normName },
        ),
      });
    else if (rangeKeyToken === 'phone')
      qb = qb.addRangeKeyCondition(indexToken, {
        property: 'phone',
        operator: 'begins_with',
        value: normPhone,
      });
    else if (rangeKeyToken === 'updated')
      qb = qb.addRangeKeyCondition(indexToken, {
        property: 'updated',
        operator: 'between',
        value: { from: updatedFrom, to: updatedTo },
      });

    if ((createdFrom || createdTo) && rangeKeyToken !== 'created')
      qb = qb.addFilterCondition(indexToken, {
        property: 'created',
        operator: 'between',
        value: { from: createdFrom, to: createdTo },
      });
  }

  const result = await qb.query({
    item: beneficiaryId ? { beneficiaryId } : {},
    timestampFrom: createdFrom,
    timestampTo: createdTo,
  });

  if (!result.items.length) return { items: [], pageKeyMap: result.pageKeyMap };

  const { items } = await entityClient.getItems(
    entityToken,
    entityClient.entityManager.getPrimaryKey(entityToken, result.items),
  );

  const sorted = sort(items, [
    {
      property: sortOrder === 'name' ? 'lastNameCanonical' : sortOrder,
      desc: sortDesc,
    },
  ]);

  return {
    items: entityClient.entityManager.removeKeys(entityToken, sorted),
    pageKeyMap: result.pageKeyMap,
  };
});
