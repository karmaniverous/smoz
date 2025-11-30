import { updateItem } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';

import { entityClient } from '@/app/entity/entityClient';

import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  const entityToken = 'user' as const;

  const { userId } = event.pathParameters;

  const { firstName, lastName, phone, ...body } = event.body;

  const keys = entityClient.entityManager.getPrimaryKey(entityToken, {
    userId,
  });

  const { items: records } = await entityClient.getItems(entityToken, keys);

  const items = entityClient.entityManager.removeKeys(entityToken, records);

  const updatedItems = items.map((item) =>
    updateItem(item, {
      ...body,
      firstNameCanonical: normstr(firstName),
      lastNameCanonical: normstr(lastName),
      phone: normstr(phone),
      updated: Date.now(),
    }),
  );

  const updatedRecords = entityClient.entityManager.addKeys(
    entityToken,
    updatedItems,
  );

  await entityClient.putItems(updatedRecords);

  return updatedItems;
});
