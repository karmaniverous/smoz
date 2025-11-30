import { entityClient } from '@/app/entity/entityClient';

import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  const entityToken = 'user' as const;

  const { userId } = event.pathParameters;

  const keys = entityClient.entityManager.getPrimaryKey(entityToken, {
    userId,
  });

  await entityClient.deleteItems(keys);

  // Return pre-shaped HTTP response with 204 to avoid body/content-type.
  return {
    statusCode: 204,
    headers: {},
    body: '',
  };
});
