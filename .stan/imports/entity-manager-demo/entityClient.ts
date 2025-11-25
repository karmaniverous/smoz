import { EntityClient } from '@karmaniverous/entity-client-dynamodb';

import { errorLogger } from '../util/logger';
import { entityManager } from './entityManager';

/**
 * DynamoDB adapter wired to our EntityManager instance.
 *
 * Notes:
 * - endpoint points to DynamoDB Local for the demo; in production
 *   you’ll remove it and rely on AWS defaults.
 * - credentials here are placeholders because DynamoDB Local does not
 *   require real credentials.
 * - tableName is defined in one place so handlers/tests share it.
 *
 * If you want to make the port configurable at runtime, consider
 * importing `env.dynamoDbLocalPort` and constructing the endpoint
 * dynamically (we keep it constant here to avoid surprising diffs
 * in docs/tests).
 */
export const entityClient = new EntityClient({
  credentials: {
    accessKeyId: 'fakeAccessKeyId',
    secretAccessKey: 'fakeSecretAccessKey',
  },
  endpoint: 'http://localhost:8000',
  entityManager,
  logger: errorLogger,
  region: 'local',
  tableName: 'UserService',
});
