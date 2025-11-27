/**
 * Handler: GET /users/{id}
 * - 200 with an empty items array when not found.
 */
import { entityClient } from '@/app/entity/entityClient';

import { fn, responseSchema } from './lambda';

export const handler = fn.handler(
  async (event) => {
    const id = event.pathParameters.id;

    const keys = entityClient.entityManager.getPrimaryKey('user', {
      userId: id,
    });
    const got = await entityClient.getItems('user', keys);

    if (!got.items.length) return { items: [] };

    const domain = entityClient.entityManager.removeKeys('user', got.items);
    return { items: domain };
  },
  { responseSchema },
);
