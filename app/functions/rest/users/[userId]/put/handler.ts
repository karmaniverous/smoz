/**
 * Handler: PUT /users/{id}
 * - Shallow update semantics (undefined ignored; null deletes).
 */
import { updateRecord } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';

import { entityClient } from '@/app/entity/entityClient';

import { getUser } from '../get/getUser';
import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  const { userId } = event.pathParameters;

  const { firstName, lastName, phone, ...body } = event.body;

  const items = await getUser(userId);

  const updatedItems = items.map((item) =>
    updateRecord(item, {
      ...body,
      firstNameCanonical: normstr(firstName),
      lastNameCanonical: normstr(lastName),
      phone: normstr(phone),
      updated: Date.now(),
    }),
  );

  const updatedRecords = entityClient.entityManager.addKeys(
    'user' as const,
    updatedItems,
  );

  await entityClient.putItems(updatedRecords);

  return updatedItems;
});
