/* REQUIREMENTS ADDRESSED (TEST)
- Non-HTTP tokens bypass Middy stack; business handler returns raw payload.
- Env is parsed per app config and passed to options.env.
*/

import type { Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { App } from '@/src/core/App';
import { baseEventTypeMapSchema } from '@/src/core/baseEventTypeMapSchema';
import { createLambdaContext } from '@/src/test/aws';
import { globalParamsSchema as testGlobalParamsSchema } from '@/src/test/serverless/config/global';
import { serverlessConfig as testServerlessConfig } from '@/src/test/serverless/config/serverlessConfig';
import { stageParamsSchema as testStageParamsSchema } from '@/src/test/serverless/config/stage';
import { devStageParams } from '@/src/test/serverless/config/stages/dev';
import { prodStageParams } from '@/src/test/serverless/config/stages/prod';

const app = App.create({
  appRootAbs: process.cwd().replace(/\\/g, '/'),
  globalParamsSchema: testGlobalParamsSchema,
  stageParamsSchema: testStageParamsSchema,
  eventTypeMapSchema: baseEventTypeMapSchema,
  serverless: testServerlessConfig,
  global: {
    params: {
      ESB_MINIFY: false,
      ESB_SOURCEMAP: true,
      PROFILE: 'dev',
      REGION: 'us-east-1',
      SERVICE_NAME: 'svc-test',
    },
    envKeys: ['REGION', 'SERVICE_NAME'] as const,
  },
  stage: {
    params: { dev: devStageParams, prod: prodStageParams },
    envKeys: ['STAGE'] as const,
  },
});

describe('wrapHandler (non-HTTP)', () => {
  it('bypasses Middy and returns raw payload', async () => {
    process.env.SERVICE_NAME = 'testService';
    process.env.REGION = 'us-east-1';
    process.env.STAGE = 'dev';
    const responseSchema = z.string();
    const fn = app.defineFunction({
      functionName: 'non_http_demo',
      eventType: 'sqs', // non-HTTP token      eventSchema,
      responseSchema,
      callerModuleUrl: import.meta.url,
      restRootAbs: process.cwd().replace(/\\/g, '/'),
    });
    const handler = fn.handler(async (_event, _ctx, opts) => {
      // env should be present
      expect(typeof opts.env.REGION).toBe('string');
      return 'ok';
    });
    const ctx: Context = createLambdaContext();
    // Provide any shape; non-HTTP bypass ignores HTTP middleware expectations
    const result = (await handler({} as never, ctx)) as unknown;
    expect(typeof result).toBe('string');
    expect(result).toBe('ok');
  });
});
