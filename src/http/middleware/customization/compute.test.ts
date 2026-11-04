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
    fnDefaults?: FunctionHttpConfig;
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
    ...(options.fnDefaults ? { fnDefaults: options.fnDefaults } : {}),
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
describe('computeHttpMiddleware: fnDefaults layer', () => {
  const defCT = 'application/vnd.def+json';
  const fdCT = 'application/vnd.fd+json';
  const profCT = 'application/vnd.prof+json';
  const fnCT = 'application/vnd.fn+json';
  const app: AppHttpConfig = {
    defaults: { contentType: defCT },
    profiles: { p: { contentType: profCT }, q: {} },
  };
  const ctFor = async (opts: {
    fnDefaults?: FunctionHttpConfig;
    fn?: FunctionHttpConfig;
  }) => {
    // Accept every candidate so the response reports the resolved type.
    const res = await run(
      async () => ({ ok: true }),
      { app, ...opts },
      [defCT, fdCT, profCT, fnCT].join(', '),
    );
    return res.headers['Content-Type'];
  };

  it('fnDefaults options beat app defaults', async () => {
    expect(
      await ctFor({ fnDefaults: { options: { contentType: fdCT } } }),
    ).toBe(fdCT);
  });

  it('a selected profile beats fnDefaults options', async () => {
    expect(
      await ctFor({
        fnDefaults: { options: { contentType: fdCT } },
        fn: { profile: 'p' },
      }),
    ).toBe(profCT);
  });

  it('the default profile beats fnDefaults options when the function selects none', async () => {
    expect(
      await ctFor({
        fnDefaults: { profile: 'p', options: { contentType: fdCT } },
      }),
    ).toBe(profCT);
  });

  it('the function profile replaces the default profile', async () => {
    expect(
      await ctFor({ fnDefaults: { profile: 'p' }, fn: { profile: 'q' } }),
    ).toBe(defCT);
  });

  it('function options beat the profile and fnDefaults', async () => {
    expect(
      await ctFor({
        fnDefaults: { profile: 'p', options: { contentType: fdCT } },
        fn: { options: { contentType: fnCT } },
      }),
    ).toBe(fnCT);
  });

  it('applies fnDefaults.extend only when the function sets no extend', async () => {
    const seen: string[] = [];
    const step = (label: string) => ({
      before: () => {
        seen.push(label);
      },
    });
    const fnDefaults: FunctionHttpConfig = {
      extend: { before: [step('default')] },
    };
    await run(async () => ({ ok: true }), { fnDefaults });
    expect(seen).toEqual(['default']);

    seen.length = 0;
    await run(async () => ({ ok: true }), {
      fnDefaults,
      fn: { extend: { before: [step('own')] } },
    });
    expect(seen).toEqual(['own']);
  });

  it('runs fnDefaults.transform after app defaults and before the profile, unless the function sets one', () => {
    const calls: string[] = [];
    const record =
      (label: string): HttpTransform =>
      (phases) => {
        calls.push(label);
        return phases;
      };
    const layered: AppHttpConfig = {
      defaults: { transform: record('app') },
      profiles: { p: { transform: record('profile') } },
    };
    computeHttpMiddleware({
      functionName: 'orderFn',
      app: layered,
      fnDefaults: { profile: 'p', transform: record('fnDefaults') },
    });
    expect(calls).toEqual(['app', 'fnDefaults', 'profile']);

    calls.length = 0;
    computeHttpMiddleware({
      functionName: 'orderFn',
      app: layered,
      fnDefaults: { profile: 'p', transform: record('fnDefaults') },
      fn: { transform: record('fn') },
    });
    expect(calls).toEqual(['app', 'profile', 'fn']);
  });

  it('uses fnDefaults.replace only when the function sets no replace', () => {
    const defaultStack = { after: () => undefined };
    const ownStack = { after: () => undefined };
    expect(
      computeHttpMiddleware({
        functionName: 'replaceFn',
        fnDefaults: { replace: { stack: defaultStack } },
      }),
    ).toBe(defaultStack);
    expect(
      computeHttpMiddleware({
        functionName: 'replaceFn',
        fnDefaults: { replace: { stack: defaultStack } },
        fn: { replace: { stack: ownStack } },
      }),
    ).toBe(ownStack);
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

describe('computeHttpMiddleware: phased replace', () => {
  /** The default phases, captured with an identity transform. */
  const defaultPhases = () => {
    let captured: Parameters<HttpTransform>[0] | undefined;
    computeHttpMiddleware({
      functionName: 'captureFn',
      eventSchema: z.object({}),
      responseSchema: z.object({ ok: z.boolean() }),
      fn: {
        transform: (phases) => {
          captured = phases;
          return phases;
        },
      },
    });
    return captured!;
  };
  const schemas = {
    eventSchema: z.object({}),
    responseSchema: z.object({ ok: z.boolean() }),
  };

  it('runs a full phased replacement', async () => {
    const res = await run(async () => ({ ok: true }), {
      ...schemas,
      fn: { replace: { stack: defaultPhases() } },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('defaults missing phases to empty and still enforces Zod', () => {
    const { before, after } = defaultPhases();
    // No onError phase: accepted (defaults to []).
    expect(() =>
      computeHttpMiddleware({
        functionName: 'phasedFn',
        ...schemas,
        fn: { replace: { stack: { before, after } } },
      }),
    ).not.toThrow();
    expect(() =>
      computeHttpMiddleware({
        functionName: 'phasedFn',
        ...schemas,
        fn: {
          replace: {
            stack: { before, after: removeStep(after, 'zod-after') },
          },
        },
      }),
    ).toThrow(/Zod validation is required.*phasedFn/);
  });
});

describe('computeHttpMiddleware: extend and partial transforms', () => {
  it('appends extend.onError steps', async () => {
    const seen: string[] = [];
    const onErrorStep = {
      onError: () => {
        seen.push('onError');
      },
    };
    await run(
      async () => {
        throw new Error('boom');
      },
      { fn: { extend: { onError: [onErrorStep] } } },
    );
    expect(seen).toEqual(['onError']);
  });

  it('keeps phases a transform does not return', async () => {
    const res = await run(async () => ({ ok: true }), {
      fn: { transform: () => ({}) },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
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
