/* REQUIREMENTS ADDRESSED (TEST)
- Validate that DYNAMODB_LOCAL_ENDPOINT switches the /app fixture EntityClient
  options into “local” mode (endpoint + local creds + region).
- Validate that cloud mode does not include local-only fields and uses REGION.
*/
import { describe, expect, it } from 'vitest';

import { resolveEntityClientOptions } from '@/app/entity/entityClient.env';

describe('app/entityClient env resolution', () => {
  it('uses Local config when DYNAMODB_LOCAL_ENDPOINT is present', () => {
    const opts = resolveEntityClientOptions({
      SERVICE_NAME: 'svc',
      STAGE: 'dev',
      DYNAMODB_LOCAL_ENDPOINT: 'http://localhost:8000',
    });

    expect(opts.tableName).toBe('svc-dev-000');
    expect('endpoint' in opts).toBe(true);
    if ('endpoint' in opts) {
      expect(opts.endpoint).toBe('http://localhost:8000');
      expect(opts.region).toBe('local');
      expect(opts.credentials).toEqual({
        accessKeyId: 'local',
        secretAccessKey: 'local',
      });
    }
  });

  it('uses cloud config when DYNAMODB_LOCAL_ENDPOINT is absent', () => {
    const opts = resolveEntityClientOptions({
      SERVICE_NAME: 'svc',
      STAGE: 'prod',
      REGION: 'us-west-2',
    });

    expect(opts.tableName).toBe('svc-prod-000');
    expect('endpoint' in opts).toBe(false);
    expect('credentials' in opts).toBe(false);
    expect(opts.region).toBe('us-west-2');
  });

  it('prefers TABLE_NAME when provided', () => {
    const opts = resolveEntityClientOptions({
      TABLE_NAME: 'explicit-table',
      REGION: 'us-east-2',
    });

    expect(opts.tableName).toBe('explicit-table');
    expect(opts.region).toBe('us-east-2');
  });
});
