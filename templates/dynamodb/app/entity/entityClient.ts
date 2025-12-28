import { EntityClient } from '@karmaniverous/entity-client-dynamodb';

import { entityManager } from '@/app/tables/000/entityManager';

const svc = process.env.SERVICE_NAME ?? 'smoz-sample';
const stage = process.env.STAGE ?? 'dev';
// Canonical default for v000 when TABLE_NAME is not supplied.
const defaultTableName = `${svc}-${stage}-000`;

const localEndpoint = process.env.DYNAMODB_LOCAL_ENDPOINT;

export const entityClient = new EntityClient({
  tableName: process.env.TABLE_NAME ?? defaultTableName,
  ...(localEndpoint
    ? {
        endpoint: localEndpoint,
        credentials: {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        },
        region: 'local',
      }
    : {
        region: process.env.REGION ?? 'us-east-1',
      }),
  entityManager,
  logger: console,
});
