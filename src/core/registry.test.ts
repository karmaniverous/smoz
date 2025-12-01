import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { EnvSchemaNode } from '@/src/core/defineAppConfig';
import { createRegistry } from '@/src/core/registry';

const G = z.object({ A: z.string(), XOPT: z.string().optional() });
const S = z.object({ B: z.string() });

const env: {
  global: EnvSchemaNode<typeof G>;
  stage: EnvSchemaNode<typeof S>;
} = {
  global: { paramsSchema: G, envKeys: ['A'] as const },
  stage: { paramsSchema: S, envKeys: ['B'] as const },
};

const deps = {
  httpEventTypeTokens: ['rest', 'http'] as const,
  env,
  http: {},
  functionDefaults: { fnEnvKeys: ['XOPT'] as const },
};

const dummyUrl =
  process.platform === 'win32'
    ? new URL('file:///C:/tmp/sandbox/app/functions/rest/hello/get/lambda.ts')
        .href
    : new URL('file:///tmp/sandbox/app/functions/rest/hello/get/lambda.ts')
        .href;
const endpointsRoot =
  process.platform === 'win32'
    ? 'C:/tmp/sandbox/app/functions/rest'
    : '/tmp/sandbox/app/functions/rest';

describe('registry', () => {
  it('rejects duplicate functionName', () => {
    const reg = createRegistry(deps);
    const define = (name: string) =>
      reg.defineFunction({
        functionName: name,
        eventType: 'rest',
        method: 'get',
        basePath: 'x',
        callerModuleUrl: dummyUrl,
        restRootAbs: endpointsRoot,
      });

    define('dup');
    expect(() => define('dup')).toThrow(/duplicate functionName/i);
  });

  it('merges default fnEnvKeys with per-function extras (unique, ordered)', () => {
    const reg = createRegistry(deps);
    reg.defineFunction({
      functionName: 'env_merge',
      eventType: 'rest',
      method: 'get',
      basePath: 'x',
      fnEnvKeys: ['B'] as const, // per-function
      callerModuleUrl: dummyUrl,
      restRootAbs: endpointsRoot,
    });

    const rows = Array.from(reg.values());
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    // XOPT (default) + B (function), de-duped and order-preserving
    expect(r.fnEnvKeys).toEqual(['XOPT', 'B']);
  });

  it('persists serverless extras for non-HTTP entries', () => {
    const extras = [{ schedule: { rate: ['rate(1 minute)'] } }];
    const reg = createRegistry(deps);
    const api = reg.defineFunction({
      functionName: 'tick',
      eventType: 'sqs',
      callerModuleUrl: dummyUrl,
      restRootAbs: endpointsRoot,
    });
    api.serverless(extras);
    const rows = Array.from(reg.values());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.serverlessExtras).toEqual(extras);
  });
});
