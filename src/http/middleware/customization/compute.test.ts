import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  type AppHttpConfig,
  computeHttpMiddleware,
  type FunctionHttpConfig,
} from '@/src/http/middleware/httpStackCustomization';
import {
  type HttpTransform,
  insertAfter,
  removeStep,
  replaceStep,
  tagStep,
} from '@/src/http/middleware/transformUtils';
import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';

type HttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const run = async (
  base: (e: APIGatewayProxyEvent, c: Context) => Promise<unknown>,
  options: {
    app?: AppHttpConfig;
    fn?: FunctionHttpConfig;
    eventSchema?: z.ZodType;
    responseSchema?: z.ZodType;
    contentType?: string;
  },
  accept?: string,
): Promise<HttpResponse> => {
  const http = computeHttpMiddleware({
    functionName: 'testFn',
    logger: console,
    ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
    ...(options.responseSchema
      ? { responseSchema: options.responseSchema }
      : {}),
    ...(options.contentType ? { contentType: options.contentType } : {}),
    ...(options.app ? { app: options.app } : {}),
    ...(options.fn ? { fn: options.fn } : {}),
  });
  const wrapped = middy(async (e: APIGatewayProxyEvent, c: Context) =>
    base(e, c),
  ).use(http);
  const evt = createApiGatewayV1Event('GET', {
    Accept: accept ?? 'application/json',
  });
  const ctx = createLambdaContext();
  return (await wrapped(evt, ctx)) as HttpResponse;
};

describe('computeHttpMiddleware: merge order', () => {
  it('fn.options.contentType wins over profile and defaults', async () => {
    const defCT = 'application/vnd.def+json';
    const profCT = 'application/vnd.prof+json';
    const fnCT = 'application/vnd.fn+json';
    const app: AppHttpConfig = {
      defaults: { contentType: defCT },
      profiles: { p: { contentType: profCT } },
    };
    const fn: FunctionHttpConfig = {
      profile: 'p',
      options: { contentType: fnCT },
    };

    const res = await run(async () => ({ ok: true }), { app, fn }, fnCT);
    const ct = (
      res.headers['Content-Type'] ??
      res.headers['content-type'] ??
      ''
    ).toLowerCase();
    expect(ct).toContain('application/vnd.fn+json');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
});
describe('computeHttpMiddleware: transform insertion', () => {
  it("insertAfter('shape', mw) can add a custom header", async () => {
    const mw = {
      after: (req: unknown) => {
        const r = req as { response?: { headers?: Record<string, string> } };
        if (!r.response) return;
        r.response.headers = {
          ...(r.response.headers ?? {}),
          'X-Transform': 'yes',
        };
      },
    };
    const transform: HttpTransform = ({ before, after, onError }) => ({
      before,
      after: insertAfter(after, 'shape', mw),
      onError,
    });
    const fn: FunctionHttpConfig = { transform };
    const res = await run(async () => ({ ok: true }), { fn });
    const hdr = res.headers['X-Transform'] ?? res.headers['x-transform'];
    expect(hdr).toBe('yes');
  });
});

describe('computeHttpMiddleware: invariants validation', () => {
  it("throws when 'error-handler' is moved into before", () => {
    const bad = tagStep({}, 'error-handler');
    const transform: HttpTransform = ({ before, after, onError }) => ({
      before: [...before, bad],
      after,
      onError,
    });
    expect(() =>
      computeHttpMiddleware({
        functionName: 'badFn',
        logger: console,
        fn: { transform },
      }),
    ).toThrow(/error-handler.*only appear in onError/i);
  });
});

describe('computeHttpMiddleware: Zod enforcement', () => {
  it('throws when responseSchema is provided and zod-after is removed', () => {
    const responseSchema = z.object({ ok: z.boolean() });
    const transform: HttpTransform = ({ before, after, onError }) => ({
      before,
      after: removeStep(after, 'zod-after'),
      onError,
    });
    expect(() =>
      computeHttpMiddleware({
        functionName: 'enforceFn',
        logger: console,
        responseSchema,
        fn: { transform },
      }),
    ).toThrow(/Zod validation is required.*zod-after/i);
  });

  it('accepts custom tagged zod-after', async () => {
    const responseSchema = z.object({ ok: z.boolean() });
    const custom = tagStep(
      {
        after: () => {
          // no-op validator; tag is what matters for enforcement
        },
      },
      'zod-after',
    );
    const transform: HttpTransform = ({ before, after, onError }) => ({
      before,
      after: replaceStep(after, 'zod-after', custom),
      onError,
    });

    const fn: FunctionHttpConfig = { transform };
    const res = await run(async () => ({ ok: true }), { responseSchema, fn });
    expect(res.statusCode).toBe(200);
  });
});

describe('computeHttpMiddleware: replace behavior', () => {
  it('throws when replace.stack is a single middleware and schemas are present', () => {
    const eventSchema = z.object({});
    const replaceMw = {} as never;
    expect(() =>
      computeHttpMiddleware({
        functionName: 'replaceFn',
        logger: console,
        eventSchema,
        fn: { replace: { stack: replaceMw } },
      }),
    ).toThrow(/Full replace.*single middleware.*schemas are present/i);
  });
});
