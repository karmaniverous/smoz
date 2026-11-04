import { describe, expect, it } from 'vitest';

import { App, baseEventTypeMapSchema } from '@/src';
import {
  globalEnvKeys,
  globalParams,
  globalParamsSchema,
} from '@/src/test/serverless/config/global';
import { serverlessConfig } from '@/src/test/serverless/config/serverlessConfig';
import {
  stageEnvKeys,
  stageParamsSchema,
} from '@/src/test/serverless/config/stage';

import { devStageParams } from './stages/dev';
import { prodStageParams } from './stages/prod';

const app = App.create({
  appRootAbs: process.cwd().replace(/\\/g, '/'),
  globalParamsSchema,
  stageParamsSchema,
  eventTypeMapSchema: baseEventTypeMapSchema,
  serverless: serverlessConfig,
  global: { params: globalParams, envKeys: globalEnvKeys },
  stage: {
    params: { dev: devStageParams, prod: prodStageParams },
    envKeys: stageEnvKeys,
  },
});

// Valid: PROFILE (global, not globally exposed) + DOMAIN_NAME (stage)
app.defineFunction({
  functionName: 'ct_ok',
  eventType: 'rest',
  httpContexts: ['public'] as const,
  method: 'get',
  basePath: 'x',
  contentType: 'application/json',
  fnEnvKeys: ['PROFILE', 'DOMAIN_NAME'] as const,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: process.cwd().replace(/\\/g, '/'),
});

// Expect compile-time failure: NOT_A_KEY not in global ∪ stage schema keys
app.defineFunction({
  functionName: 'ct_bad',
  eventType: 'rest',
  httpContexts: ['public'] as const,
  method: 'get',
  basePath: 'y',
  contentType: 'application/json',
  // @ts-expect-error invalid fnEnvKeys
  fnEnvKeys: ['NOT_A_KEY'] as const,
  callerModuleUrl: import.meta.url,
  endpointsRootAbs: process.cwd().replace(/\\/g, '/'),
});

// The invalid case above only enforces a compile-time constraint via the
// expect-error directive; the valid function is checked at runtime below.
describe('compiletime.fnEnvKeys', () => {
  it('exposes the fnEnvKeys of a valid function', () => {
    expect(app.buildAllServerlessFunctions()?.ct_ok?.environment).toEqual({
      PROFILE: '${param:PROFILE}',
      DOMAIN_NAME: '${param:DOMAIN_NAME}',
    });
  });
});

export {};
