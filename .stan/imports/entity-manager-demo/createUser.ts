import type { MakeOptional } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';
import { nanoid } from 'nanoid';

import { entityClient } from '../../entity-manager/entityClient';
import type { UserItem } from '../../entity-manager/User';
import { readUser } from './readUser';

/**
 * `createUser` params.
 */
export type CreateUserParams = MakeOptional<
  UserItem,
  'created' | 'firstNameCanonical' | 'lastNameCanonical' | 'updated' | 'userId'
>;

/**
 * Create a user record in the database.
 *
 * @param params - User record params. Generated properties will be overwritten.
 *
 * @returns Created user record.
 *
 * @throws Error if user record already exists.
 *
 * @category User
 */
export const createUser = async (
  params: CreateUserParams,
): Promise<UserItem> => {
  const entityToken = 'user';

  // Extract params.
  const { firstName, lastName, userId, ...rest } = params;

  // Throw error if record already exists.
  if (userId && (await readUser(userId)).length)
    throw new Error('Email record already exists.');

  // Create new item.
  // Canonical forms are stored alongside raw names to make searching trivial
  // and case/diacritic-insensitive.
  const now = Date.now();
  const item: UserItem = {
    ...rest,
    created: now,
    firstName,
    firstNameCanonical: normstr(firstName) ?? '',
    lastName,
    lastNameCanonical: normstr(lastName) ?? '',
    updated: now,
    userId: userId ?? nanoid(),
  };

  // Generate record from item.
  // This adds global hash/range keys and any generated tokens required by
  // indexes based on the Entity Manager config.
  const record = entityClient.entityManager.addKeys(entityToken, item);

  // Create record in database.
  await entityClient.putItem(record);

  // Return new item.
  return item;
};
