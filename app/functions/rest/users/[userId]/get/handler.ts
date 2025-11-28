/**
 * Handler: GET /users/{id}
 * - 200 with an empty items array when not found.
 */
import { getUser } from './getUser';
import { fn } from './lambda';

export const handler = fn.handler((event) =>
  getUser(event.pathParameters.userId),
);
