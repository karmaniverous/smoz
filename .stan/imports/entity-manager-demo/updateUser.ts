import { type MakeUpdatable, updateRecord } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';

import { entityClient } from '../../entity-manager/entityClient';
import type { UserItem } from '../../entity-manager/User';
import { readUser } from './readUser';

/**
 * Update user records in the database based on unique userId.
 *
 * @param data - User update data. Only `userId` is required. Generated properties will be overwritten. `null` optional properties will be deleted.
 *
 * @throws Error if user records do not exist.
 *
 * Shallow update semantics:
 * - undefined properties are ignored
 * - null properties are assigned (and removed from final payload)
 *
 * Returns domain items (array) for consistency with read/search handlers.
 *
 * @category User
 */
export const updateUser = async (
  data: MakeUpdatable<UserItem, 'userId'>,
): Promise<UserItem[]> => {
  const entityToken = 'user';

  // Extract properties.
  const { firstName, lastName, userId, ...rest } = data;

  // Get records from database.
  const items = await readUser(userId);

  // Throw error if records don't exist.
  if (!items.length) throw new Error('User records do not exist.');

  // Update items.
  const updatedItems = items.map((item) =>
    updateRecord(item, {
      firstName,
      firstNameCanonical: normstr(firstName),
      lastName,
      lastNameCanonical: normstr(lastName),
      updated: Date.now(),
      ...rest,
    }),
  );

  // Add keys to updated items.
  const updatedRecords = entityClient.entityManager.addKeys(
    entityToken,
    updatedItems,
  );

  // Update record in database.
  await entityClient.putItems(updatedRecords);

  // Return updated item.
  return updatedItems;
};
