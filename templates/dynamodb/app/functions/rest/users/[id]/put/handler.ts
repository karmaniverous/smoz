import { updateRecord } from '@karmaniverous/entity-tools';
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
  const userId = 'example-id';

  const keys = entityClient.entityManager.getPrimaryKey('user', { userId });
  const { items } = await entityClient.getItems('user', keys);
  const domain = entityClient.entityManager.removeKeys(
    'user',
    items,
  ) as UserItem[];
  if (!domain.length) return [] as Response;

  const updates = domain.map((item) =>
    updateRecord(item, {
      // In a real app, take values from the body; here we nudge "updated".
      updated: Date.now(),
      firstNameCanonical: normstr(item.firstName),
      lastNameCanonical: normstr(item.lastName),
    }),
  );

  const records = entityClient.entityManager.addKeys('user', updates);
  await entityClient.putItems(records);
  return updates;
});
