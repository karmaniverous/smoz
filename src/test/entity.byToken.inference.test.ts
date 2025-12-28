/* REQUIREMENTS ADDRESSED (COMPILE-TIME TEST)
- Non-projection: query → keys → getItems → removeKeys must narrow to strict
  domain types without casts.
- Projection: getItems(attributes as const) must remain partial and not be
  assignable to the strict domain type unless re-enriched.
*/
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import type { userSchema } from '@/app/domain/user';
import { entityClient } from '@/app/entity/entityClient';

type UserItem = z.infer<typeof userSchema>;

const strictNonProjection = async (): Promise<void> => {
  const token = 'user' as const;
  const keys = entityClient.entityManager.getPrimaryKey(token, {
    userId: 'u1',
    created: 0,
  });

  const { items: records } = await entityClient.getItems(token, keys);
  const items = entityClient.entityManager.removeKeys(token, records);

  const typed: UserItem[] = items;
  void typed;
};

const projectionStaysPartial = async (): Promise<void> => {
  const token = 'user' as const;
  const keys = entityClient.entityManager.getPrimaryKey(token, {
    userId: 'u1',
    created: 0,
  });

  const { items: projected } = await entityClient.getItems(token, keys, [
    'userId',
  ] as const);
  const items = entityClient.entityManager.removeKeys(token, projected);

  // @ts-expect-error projected items are partial; strict assignment must fail
  const typed: UserItem[] = items;
  void typed;
};

// compile-time only
void strictNonProjection;
void projectionStaysPartial;

describe('entity by-token inference (compiletime)', () => {
  it('compiles with expected @ts-expect-error markers', () => {
    expect(true).toBe(true);
  });
});

export {};
