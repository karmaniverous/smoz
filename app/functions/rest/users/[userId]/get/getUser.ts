import type { UserItem, UserRecord } from '@/app/domain/user';
import { entityClient } from '@/app/entity/entityClient';

/**
 * Read user records from the database based on unique userId.
 *
 * @param userId - User record unique id.
 * @param keepKeys - Whether to keep storage keys in the returned records.
 *
 * @returns User item or record array, empty if not found.
 */
export function getUser(
  userId: UserItem['userId'],
  keepKeys: true,
): Promise<UserRecord[]>; // records with keys
export function getUser(
  userId: UserItem['userId'],
  keepKeys?: false,
): Promise<UserItem[]>; // domain items (keys removed)
export async function getUser(userId: UserItem['userId'], keepKeys = false) {
  const entityToken = 'user' as const;

  const keys = entityClient.entityManager.getPrimaryKey(entityToken, {
    userId,
  });

  const { items } = await entityClient.getItems(entityToken, keys);

  if (keepKeys) return items;

  return entityClient.entityManager.removeKeys(entityToken, items);
}
