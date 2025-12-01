/* REQUIREMENTS ADDRESSED (TEST)
- Ensure `makeWrapHandler` produces HTTP-shaped responses for HTTP events (GET/HEAD/POST) and validates payloads.
- Ensure HEAD short-circuits and that content-type negotiation is respected.
- Ensure wrapper reads env via mocked production config modules.
*/
import type { Context } from 'aws-lambda';
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
import type { ConsoleLogger } from '@/src/types/Loggable';

// Minimal App instance for tests (schema-first)
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
describe('wrapHandler: GET happy path', () => {
  it('returns the business payload when validation passes and env is present', async () => {
    // Ensure required env vars are set for validation
    process.env.SERVICE_NAME = 'testService';
    process.env.PROFILE = 'testProfile';
    process.env.STAGE = 'testStage';
    process.env.REGION = 'testRegion';
    const eventSchema = z.object({});
    const responseSchema = z.object({ what: z.string() });
    const logger: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    const fn = app.defineFunction({
      functionName: 'test_get',
      eventType: 'rest',
      httpContexts: ['public'],
      method: 'get',
      basePath: 'test',
      contentType: 'application/json',
      eventSchema,
      responseSchema,
      callerModuleUrl: import.meta.url,
      restRootAbs: process.cwd().replace(/\\/g, '/'),
    });
    const handler = fn.handler(async () => {
      logger.debug('business invoked');
      return { what: 'ok' };
    });

    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx: Context = createLambdaContext();
    const res = (await handler(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };
    expect(res.statusCode).toBe(200);
    expect(
      (
        res.headers['Content-Type'] ??
        res.headers['content-type'] ??
        ''
      ).toLowerCase(),
    ).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({ what: 'ok' });
  });
});

describe('wrapHandler: HEAD short-circuit', () => {
  it('responds 200 {} with Content-Type', async () => {
    const eventSchema = z.object({});
    const responseSchema = z.object({}).optional();

    // Ensure required env vars are set for validation
    process.env.SERVICE_NAME = 'testService';
    process.env.PROFILE = 'testProfile';
    process.env.STAGE = 'testStage';
    process.env.REGION = 'testRegion';
    const fn = app.defineFunction({
      functionName: 'test_head',
      eventType: 'rest',
      httpContexts: ['public'],
      method: 'head',
      basePath: 'test',
      contentType: 'application/json',
      eventSchema,
      responseSchema,
      callerModuleUrl: import.meta.url,
      restRootAbs: process.cwd().replace(/\\/g, '/'),
    });
    const handler = fn.handler(async () => ({}));
    const event = createApiGatewayV1Event('HEAD', {
      Accept: 'application/json',
    });
    const ctx: Context = createLambdaContext();

    const res = (await handler(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };
    expect(res.statusCode).toBe(200);
    const contentType =
      res.headers['Content-Type'] ?? res.headers['content-type'] ?? '';
    expect(contentType.toLowerCase()).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({});
  });
});

describe('wrapHandler: POST payload', () => {
  it('JSON shapes response and validates body', async () => {
    const eventSchema = z.object({});
    const responseSchema = z.object({ what: z.string() });

    // Ensure required env vars are set for validation
    process.env.SERVICE_NAME = 'testService';
    process.env.PROFILE = 'testProfile';
    process.env.STAGE = 'testStage';
    process.env.REGION = 'testRegion';

    const fn = app.defineFunction({
      functionName: 'test_post',
      eventType: 'rest',
      httpContexts: ['public'],
      method: 'post',
      basePath: 'test',
      contentType: 'application/json',
      eventSchema,
      responseSchema,
      callerModuleUrl: import.meta.url,
      restRootAbs: process.cwd().replace(/\\/g, '/'),
    });
    const handler = fn.handler(async () => ({ what: 'ok' }));
    const event = createApiGatewayV1Event('POST', {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    const ctx: Context = createLambdaContext();

    const res = (await handler(event, ctx)) as unknown as {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
    };

    expect(res.statusCode).toBe(200);
    expect(
      (
        res.headers['Content-Type'] ??
        res.headers['content-type'] ??
        ''
      ).toLowerCase(),
    ).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({ what: 'ok' });
  });
});
