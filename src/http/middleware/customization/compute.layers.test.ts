/* REQUIREMENTS ADDRESSED (TEST)
- computeHttpMiddleware merges app, function-default and function layers in order.
*/
import { describe, expect, it } from 'vitest';

import {
  type AppHttpConfig,
  computeHttpMiddleware,
  type FunctionHttpConfig,
} from '@/src/http/middleware/httpStackCustomization';
import type { HttpTransform } from '@/src/http/middleware/transformUtils';
import { run } from '@/src/test/computeHttp';

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
  const baseCT = 'application/vnd.base+json';
  const ownCT = 'application/vnd.own+json';
  const ctFor = async (opts: {
    app?: AppHttpConfig;
    fnDefaults?: FunctionHttpConfig;
    fn?: FunctionHttpConfig;
    contentType?: string;
    fnContentType?: string;
  }) => {
    // Accept every candidate so the response reports the resolved type.
    const res = await run(
      async () => ({ ok: true }),
      { app, ...opts },
      [baseCT, defCT, fdCT, profCT, ownCT, fnCT].join(', '),
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

  it('the base contentType is below app defaults', async () => {
    expect(await ctFor({ contentType: baseCT })).toBe(defCT);
    expect(await ctFor({ app: {}, contentType: baseCT })).toBe(baseCT);
  });

  it("the function's own contentType beats every default and the profile", async () => {
    expect(
      await ctFor({
        contentType: baseCT,
        fnDefaults: { profile: 'p', options: { contentType: fdCT } },
        fnContentType: ownCT,
      }),
    ).toBe(ownCT);
    expect(await ctFor({ fn: { profile: 'p' }, fnContentType: ownCT })).toBe(
      ownCT,
    );
  });

  it("function options beat the function's own contentType", async () => {
    expect(
      await ctFor({
        fnContentType: ownCT,
        fn: { profile: 'p', options: { contentType: fnCT } },
      }),
    ).toBe(fnCT);
  });

  it('throws for an unknown profile, naming where it was set and the known ones', () => {
    const build =
      (args: {
        fnDefaults?: FunctionHttpConfig;
        fn?: FunctionHttpConfig;
        app?: AppHttpConfig;
      }) =>
      () =>
        computeHttpMiddleware({ functionName: 'profileFn', app, ...args });
    expect(build({ fn: { profile: 'nope' } })).toThrow(
      `Unknown HTTP profile "nope" (http.profile) on function 'profileFn'. Known profiles: p, q.`,
    );
    expect(build({ fnDefaults: { profile: 'nope' } })).toThrow(
      '"nope" (functionDefaults.http.profile)',
    );
    // The function's valid profile replaces an unknown default one.
    expect(
      build({ fnDefaults: { profile: 'nope' }, fn: { profile: 'q' } }),
    ).not.toThrow();
    expect(build({ app: {}, fn: { profile: 'p' } })).toThrow(
      'Known profiles: (none).',
    );
    // A key inherited from Object.prototype is not a profile.
    expect(build({ fn: { profile: 'toString' } })).toThrow(
      'Unknown HTTP profile "toString"',
    );
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
