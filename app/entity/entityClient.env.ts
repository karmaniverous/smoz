/**
 * REQUIREMENTS ADDRESSED
 * - Provide a pure env→EntityClient options resolver for the /app fixture.
 * - Honor DYNAMODB_LOCAL_ENDPOINT to target Local automatically when present.
 * - Compute a stable default TABLE_NAME for version 000 when TABLE_NAME is unset.
 */

export type EntityClientEnv = Record<string, string | undefined>;

export type LocalEntityClientOptions = {
  tableName: string;
  endpoint: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  region: 'local';
};

export type CloudEntityClientOptions = {
  tableName: string;
  region: string;
};

export type ResolvedEntityClientOptions =
  | LocalEntityClientOptions
  | CloudEntityClientOptions;

export const resolveEntityClientOptions = (
  env: EntityClientEnv,
): ResolvedEntityClientOptions => {
  const svc = env.SERVICE_NAME ?? 'smoz-sample';
  const stage = env.STAGE ?? 'dev';
  // Canonical default for the fixture when TABLE_NAME is not supplied.
  const defaultTableName = `${svc}-${stage}-000`;

  const tableName = env.TABLE_NAME ?? defaultTableName;

  const localEndpoint = env.DYNAMODB_LOCAL_ENDPOINT;
  if (localEndpoint) {
    return {
      tableName,
      endpoint: localEndpoint,
      // Minimal local credentials to satisfy SDK when pointing at Local.
      credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local',
      },
      region: 'local',
    };
  }

  return {
    tableName,
    // Use process defaults in cloud; region from env when present.
    region: env.REGION ?? 'us-east-1',
  };
};
