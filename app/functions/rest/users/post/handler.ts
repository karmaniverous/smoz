/**
 * Handler: POST /users (create)
 */
import { normstr } from '@karmaniverous/string-utilities';
import { nanoid } from 'nanoid';

import type { UserItem } from '@/app/domain/user';
import { entityClient } from '@/app/entity/entityClient';

import { fn } from './lambda';

export const handler = fn.handler(async (event) => {
  const { firstName, lastName, phone, ...body } = event.body;

  const now = Date.now();
  const item: UserItem = {
    ...body,
    created: now,
    firstName,
    firstNameCanonical: normstr(firstName),
    lastName,
    lastNameCanonical: normstr(lastName),
    phone: normstr(phone),
    updated: now,
    userId: nanoid(),
  };

  const record = entityClient.entityManager.addKeys('user' as const, item);

  await entityClient.putItem(record);

  return item;
});
