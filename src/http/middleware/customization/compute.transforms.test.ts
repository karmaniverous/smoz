/* REQUIREMENTS ADDRESSED (TEST)
- computeHttpMiddleware transforms, invariants, Zod enforcement, phased replace
  and extend behave as documented.
*/
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  type AppHttpConfig,
  computeHttpMiddleware,
  type FunctionHttpConfig,
} from '@/src/http/middleware/httpStackCustomization';
import {
  type ApiMiddleware,
  getId,
  type HttpTransform,
  insertAfter,
  removeStep,
  replaceStep,
  tagStep,
} from '@/src/http/middleware/transformUtils';
import type { HttpResponse } from '@/src/test/computeHttp';
import { run } from '@/src/test/computeHttp';

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

describe('computeHttpMiddleware: extend.after', () => {
  /**
   * An after step recording, in the response body, its label and what it
   * saw: the body's type (an object until `serializer`) and the
   * Content-Type header (unset until `shape`).
   */
  const step = (label: string) => ({
    after: (request: unknown) => {
      const res = (
        request as {
          response: {
            body: Record<string, unknown>;
            headers: Record<string, string>;
          };
        }
      ).response;
      const seen = `${label}:${typeof res.body}:${res.headers['Content-Type'] ?? 'none'}`;
      res.body.layers = [
        ...((res.body.layers as string[] | undefined) ?? []),
        seen,
      ];
    },
  });
  const appWith = (): AppHttpConfig => ({
    defaults: { extend: { after: [step('app')] } },
    profiles: { p: { extend: { after: [step('profile')] } } },
  });
  const layersOf = async (res: HttpResponse) =>
    (JSON.parse(res.body) as { layers: string[] }).layers;

  it('runs every layer before shape, in layer order (app, fnDefaults, profile)', async () => {
    const res = await run(async () => ({ ok: true }), {
      app: appWith(),
      fnDefaults: { profile: 'p', extend: { after: [step('fnDefaults')] } },
    });
    expect(res.statusCode).toBe(200);
    // Each step saw an object body and no Content-Type: neither shape nor
    // serializer had run, and what they added reached the response.
    expect(await layersOf(res)).toEqual([
      'app:object:none',
      'fnDefaults:object:none',
      'profile:object:none',
    ]);
  });

  it('runs the function layer last, keeping several steps in order', async () => {
    const res = await run(async () => ({ ok: true }), {
      app: appWith(),
      fn: {
        profile: 'p',
        extend: { after: [step('fn1'), step('fn2')] },
      },
    });
    expect(await layersOf(res)).toEqual([
      'app:object:none',
      'profile:object:none',
      'fn1:object:none',
      'fn2:object:none',
    ]);
  });

  it("keeps the invariants: steps sit just before 'shape', 'serializer' last", () => {
    const mine = step('mine');
    let after: ApiMiddleware[] = [];
    computeHttpMiddleware({
      functionName: 'afterFn',
      app: { defaults: { extend: { after: [mine] } } },
      fn: {
        transform: (phases) => {
          after = phases.after;
          return phases;
        },
      },
    });
    const ids = after.map((m) => (m === mine ? 'mine' : getId(m)));
    expect(ids.slice(-3)).toEqual(['mine', 'shape', 'serializer']);
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
