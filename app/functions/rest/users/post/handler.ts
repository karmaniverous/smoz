/**
 * Handler: POST /users (create)
 */
import { normstr } from '@karmaniverous/string-utilities';
import { nanoid } from 'nanoid';

import type { UserItem } from '@/app/domain/user';
import { entityClient } from '@/app/entity/entityClient';

import { fn, responseSchema } from './lambda';

type Response = UserItem;

export const handler = fn.handler(
  async (event): Promise<Response> => {
    const body = event.body;

    const now = Date.now();
    const userId = body.userId ?? nanoid();
    // Uniqueness check by userId
    {
      const keys = entityClient.entityManager.getPrimaryKey('user', { userId });
      const existing = await entityClient.getItems('user', keys);
      if (existing.items.length) {
        throw new Error('User record already exists.');
      }
    }

    const item: UserItem = {
      beneficiaryId: body.beneficiaryId,
      firstName: body.firstName,
      firstNameCanonical: normstr(body.firstName) ?? '',
      lastName: body.lastName,
      lastNameCanonical: normstr(body.lastName) ?? '',
      phone: body.phone,
      userId,
      created: now,
      updated: now,
    };

    const record = entityClient.entityManager.addKeys('user', item);
    await entityClient.putItem(record);

    return item;
  },
  { responseSchema },
);
