import { entityClient } from '../../entity-manager/entityClient';
import type { UserItem, UserRecord } from '../../entity-manager/User';

/**
 * Read user records from the database based on unique userId.
 *
 * @param userId - User record unique id.
 *
 * @returns User record array, empty if not found.
 *
 * @category User
 *
 * keepKeys=true → returns records (with keys); keepKeys omitted/false →
 * returns domain items (generated/global keys removed).
 */
export function readUser(
  userId: UserItem['userId'],
  keepKeys: true,
): Promise<UserRecord[]>; // records with keys
export function readUser(
  userId: UserItem['userId'],
  keepKeys?: false,
): Promise<UserItem[]>; // domain items (keys removed)
export async function readUser(userId: UserItem['userId'], keepKeys = false) {
  const entityToken = 'user' as const;

  const keys = entityClient.entityManager.getPrimaryKey(entityToken, {
    userId,
  });

  const { items } = await entityClient.getItems(entityToken, keys);

  if (keepKeys) return items;

  return entityClient.entityManager.removeKeys(entityToken, items);
}
