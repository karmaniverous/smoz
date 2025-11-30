import { entityClient } from '@/app/entity/entityClient';

import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  const entityToken = 'user' as const;

  const { userId } = event.pathParameters;

  const keys = entityClient.entityManager.getPrimaryKey(entityToken, {
    userId,
  });

  const { items: records } = await entityClient.getItems(entityToken, keys);

  return entityClient.entityManager.removeKeys(entityToken, records);
});
