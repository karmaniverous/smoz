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
  // In a real app, parse/validate body from the event. Here we construct a minimal example.
  const now = Date.now();
  const firstName = 'Jane';
  const lastName = 'Doe';
  const item: UserItem = {
    userId: crypto.randomUUID(),
    beneficiaryId: undefined,
    firstName,
    lastName,
    firstNameCanonical: normstr(firstName) ?? '',
    lastNameCanonical: normstr(lastName) ?? '',
    phone: undefined,
    created: now,
    updated: now,
  };

  const record = entityClient.entityManager.addKeys('user', item);
  await entityClient.putItem(record);
  return item;
});
