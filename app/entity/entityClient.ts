/**
 + REQUIREMENTS ADDRESSED
 + - Provide an EntityClient instance for the /app fixture.
 + - Honor DYNAMODB_LOCAL_ENDPOINT to target Local automatically when present.
 + - Compute a default TABLE_NAME from SERVICE_NAME/STAGE with version 000 when
 +   TABLE_NAME is not explicitly provided (fixture only).
 */
import { EntityClient } from '@karmaniverous/entity-client-dynamodb';

import { entityManager } from '@/app/tables/000/entityManager';

const svc = process.env.SERVICE_NAME ?? 'smoz-sample';
const stage = process.env.STAGE ?? 'dev';
// Canonical default for the fixture when TABLE_NAME is not supplied.
const defaultTableName = `${svc}-${stage}-000`;

const localEndpoint = process.env.DYNAMODB_LOCAL_ENDPOINT;

export const entityClient = new EntityClient({
  tableName: process.env.TABLE_NAME ?? defaultTableName,
  // Local endpoint if provided; otherwise SDK defaults to cloud.
  ...(localEndpoint ? { endpoint: localEndpoint } : {}),
  // Minimal local credentials to satisfy SDK when pointing at Local.
  ...(localEndpoint
    ? {
        credentials: {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        },
        region: 'local',
      }
    : {
        // Use process defaults in cloud; region from env when present.
        region: process.env.REGION ?? 'us-east-1',
      }),
  entityManager,
  logger: console,
});
