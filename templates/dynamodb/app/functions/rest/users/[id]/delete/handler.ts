import type { z } from 'zod';

import { entityClient } from '@/app/entity/entityClient';

import type { responseSchema } from './lambda';
import { fn } from './lambda';

type Response = z.infer<typeof responseSchema>;

type FnHandlerApi<T> = {
  handler: (impl: () => Promise<T> | T) => (...args: unknown[]) => Promise<T>;
};

const reg = fn as unknown as FnHandlerApi<Response>;

export const handler = reg.handler(async () => {
  const userId = 'example-id';
  const records = await entityClient.getItems(
    'user',
    entityClient.entityManager.getPrimaryKey('user', { userId }),
  );
  if (!records.items.length) return { ok: true };

  const keys = entityClient.entityManager.getPrimaryKey('user', records.items);
  await entityClient.deleteItems(keys);
  return { ok: true };
});
