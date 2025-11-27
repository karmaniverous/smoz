/**
 * Handler: DELETE /users/{id}
 * - 204 No Content on success (no payload).
 */
import { entityClient } from '@/app/entity/entityClient';

import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  const id = event.pathParameters.id;

  const keys = entityClient.entityManager.getPrimaryKey('user', { userId: id });
  const got = await entityClient.getItems('user', keys);
  if (got.items.length) {
    await entityClient.deleteItems(
      got.items.map((r) => ({
        hashKey: (r as any).hashKey,
        rangeKey: (r as any).rangeKey,
      })),
    );
  }
  // Return pre-shaped HTTP response with 204 to avoid body/content-type.
  return {
    statusCode: 204,
    headers: {},
    body: '',
  };
});
