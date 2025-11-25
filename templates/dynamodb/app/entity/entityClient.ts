import { EntityClient } from '@karmaniverous/entity-client-dynamodb';

import { entityManager } from '@/tables/000/entityManager';

/**
 * Resolve table name and endpoint from environment.
 * - Prefer TABLE_NAME; else derive from STAGE_NAME + TABLE_VERSION (default "000").
 * - When DYNAMODB_LOCAL_ENDPOINT is present, the client uses it with region "local"
 *   and placeholder credentials.
 */
const {
  DYNAMODB_LOCAL_ENDPOINT,
  REGION = 'us-east-1',
  SERVICE_NAME = 'my-smoz-app',
  STAGE_NAME = `${SERVICE_NAME}-dev`,
  TABLE_NAME,
  TABLE_VERSION = '000',
} = process.env;

const tableName = TABLE_NAME ?? `${STAGE_NAME}-${TABLE_VERSION}`;

export const entityClient = new EntityClient({
  tableName,
  entityManager,
  ...(DYNAMODB_LOCAL_ENDPOINT
    ? {
        endpoint: DYNAMODB_LOCAL_ENDPOINT,
        region: 'local',
        credentials: {
          accessKeyId: 'fakeAccessKeyId',
          secretAccessKey: 'fakeSecretAccessKey',
        },
      }
    : { region: REGION }),
});
