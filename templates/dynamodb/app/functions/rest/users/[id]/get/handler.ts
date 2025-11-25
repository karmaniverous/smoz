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
  // For the template, supply a fake id or derive from your event mapping.
  const userId = 'example-id';
  const keys = entityClient.entityManager.getPrimaryKey('user', { userId });
  const { items } = await entityClient.getItems('user', keys);
  const domain = entityClient.entityManager.removeKeys('user', items);
  return (domain[0] ?? null) as Response;
});
