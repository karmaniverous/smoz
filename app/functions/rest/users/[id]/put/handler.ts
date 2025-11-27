/**
 * Handler: PUT /users/{id}
 * - Shallow update semantics (undefined ignored; null deletes).
 */
import { updateRecord } from '@karmaniverous/entity-tools';
import { normstr } from '@karmaniverous/string-utilities';

import type { UserItem } from '@/app/domain/user';
import { entityClient } from '@/app/entity/entityClient';

import { fn, responseSchema } from './lambda';

export const handler = fn.handler(
  async (event) => {
    const id = event.pathParameters.id;
    const body = event.body;

    // Read existing items
    const keys = entityClient.entityManager.getPrimaryKey('user', {
      userId: id,
    });
    const got = await entityClient.getItems('user', keys);
    if (!got.items.length) return [] as UserItem[];

    // Convert to domain
    const domain = entityClient.entityManager.removeKeys('user', got.items);

    // Prepare patch (respect shallow rules; null deletes optional phone)
    const patch: Partial<UserItem> = {
      ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
      ...(body.phone !== undefined
        ? { phone: body.phone === null ? undefined : body.phone }
        : {}),
      ...(body.firstName !== undefined
        ? { firstNameCanonical: normstr(body.firstName) ?? '' }
        : {}),
      ...(body.lastName !== undefined
        ? { lastNameCanonical: normstr(body.lastName) ?? '' }
        : {}),
      updated: Date.now(),
    };

    const updatedItems = domain.map((it) => updateRecord(it, patch));
    const updatedRecords = entityClient.entityManager.addKeys(
      'user',
      updatedItems,
    );
    await entityClient.putItems(updatedRecords);

    return updatedItems;
  },
  { responseSchema },
);
