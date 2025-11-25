import { entityClient } from '../../entity-manager/entityClient';
import type { UserItem } from '../../entity-manager/User';
import { readUser } from './readUser';

/**
 * Delete user records from the database based on unique userId.
 *
 * @param userId - User record unique id.
 *
 * @throws Error if user records do not exist.
 *
 * @category User
 *
 * Read first → derive exact primary keys → delete. This enforces existence
 * and prevents accidental deletion by partial key.
 */
export const deleteUser = async (userId: UserItem['userId']): Promise<void> => {
  const entityToken = 'user';

  // Get records from database.
  const items = await readUser(userId, true);

  // Throw error if records don't exist.
  if (!items.length) throw new Error('User records do not exist.');

  // Get key from record.
  const keys = entityClient.entityManager.getPrimaryKey(entityToken, items);

  // Delete record from database.
  await entityClient.deleteItems(keys);
};
