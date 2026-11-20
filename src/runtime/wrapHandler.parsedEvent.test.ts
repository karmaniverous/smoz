/* REQUIREMENTS ADDRESSED (TEST)
- #39 D2/D4: HTTP and non-HTTP handlers receive the eventSchema's parsed
  output overlaid on the raw event (declared keys parsed, undeclared raw).
- #39 D4: CORS still sees the raw Origin header when the schema doesn't declare headers.
- #39 D5: non-HTTP event and response schema failures throw.
*/
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { App } from '@/src/core/App';
import { baseEventTypeMapSchema } from '@/src/core/baseEventTypeMapSchema';
import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';
import { globalParamsSchema as testGlobalParamsSchema } from '@/src/test/serverless/config/global';
import { serverlessConfig as testServerlessConfig } from '@/src/test/serverless/config/serverlessConfig';
import { stageParamsSchema as testStageParamsSchema } from '@/src/test/serverless/config/stage';
import { devStageParams } from '@/src/test/serverless/config/stages/dev';
import { prodStageParams } from '@/src/test/serverless/config/stages/prod';

const root = process.cwd().replace(/\\/g, '/');

const app = App.create({
  appRootAbs: root,
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
    envKeys: ['REGION', 'SERVICE_NAME'],
  },
  stage: {
    params: { dev: devStageParams, prod: prodStageParams },
    envKeys: ['STAGE'],
  },
});

process.env.SERVICE_NAME = 'svc';
process.env.REGION = 'us-east-1';
process.env.STAGE = 'dev';

type HttpRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

describe('HTTP: handler receives the parsed event', () => {
  const fn = app.defineFunction({
    functionName: 'parsed_get',
    eventType: 'rest',
    method: 'get',
    basePath: 'parsed',
    httpContexts: ['public'],
    eventSchema: z.object({
      queryStringParameters: z.object({ limit: z.coerce.number() }),
    }),
    callerModuleUrl: import.meta.url,
    endpointsRootAbs: root,
  });
  const handler = fn.handler(async (event) => ({
    limitType: typeof event.queryStringParameters.limit,
    limit: event.queryStringParameters.limit,
    path: event.path,
  }));

  const call = async (headers: Record<string, string> = {}) => {
    const evt = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
      ...headers,
    });
    evt.queryStringParameters = { limit: '5' };
    evt.path = '/raw-path';
    return (await handler(evt, createLambdaContext())) as HttpRes;
  };

  it('delivers parsed values on declared keys and raw values on the rest', async () => {
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      limitType: 'number',
      limit: 5,
      path: '/raw-path',
    });
  });

  it('keeps the raw Origin header for CORS when headers are not declared', async () => {
    const res = await call({ Origin: 'https://example.test' });
    const allow = Object.entries(res.headers).find(
      ([k]) => k.toLowerCase() === 'access-control-allow-origin',
    )?.[1];
    expect(allow).toBe('https://example.test');
  });
});

describe('non-HTTP: schemas are enforced around the handler', () => {
  const eventSchema = z.object({
    Records: z.array(z.object({ body: z.string() })),
    batch: z.coerce.number(),
  });

  it('delivers the parsed event overlaid on the raw one', async () => {
    const fn = app.defineFunction({
      functionName: 'sqs_parsed',
      eventType: 'sqs',
      eventSchema,
      callerModuleUrl: import.meta.url,
      endpointsRootAbs: root,
    });
    const handler = fn.handler(async (event) => ({
      batch: event.batch,
      extra: (event as unknown as { extra: string }).extra,
    }));
    expect(
      await handler(
        { Records: [{ body: 'b' }], batch: '3', extra: 'kept' },
        createLambdaContext(),
      ),
    ).toEqual({ batch: 3, extra: 'kept' });
  });

  it('throws Invalid event before the handler runs', async () => {
    const business = vi.fn(async () => 'ran');
    const fn = app.defineFunction({
      functionName: 'sqs_bad_event',
      eventType: 'sqs',
      eventSchema,
      callerModuleUrl: import.meta.url,
      endpointsRootAbs: root,
    });
    await expect(
      fn.handler(business)({ Records: [1], batch: 1 }, createLambdaContext()),
    ).rejects.toMatchObject({ name: 'ZodError', message: 'Invalid event' });
    expect(business).not.toHaveBeenCalled();
  });

  it('throws Invalid response when the result fails responseSchema', async () => {
    const fn = app.defineFunction({
      functionName: 'sqs_bad_response',
      eventType: 'sqs',
      responseSchema: z.object({ ok: z.boolean() }),
      callerModuleUrl: import.meta.url,
      endpointsRootAbs: root,
    });
    const handler = fn.handler(
      async () => ({ ok: 'yes' }) as unknown as { ok: boolean },
    );
    await expect(
      handler({ Records: [] }, createLambdaContext()),
    ).rejects.toMatchObject({ name: 'ZodError', message: 'Invalid response' });
  });
});
