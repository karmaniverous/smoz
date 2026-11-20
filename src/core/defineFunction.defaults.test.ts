/* REQUIREMENTS ADDRESSED (TEST)
- functionDefaults httpContexts, contentType (with its precedence) and
  fnEnvKeys apply with precedence explicit > functionDefaults > built-in.
*/
import { describe, expect, it } from 'vitest';

import {
  at,
  call,
  fnsOf,
  httpEvents,
  makeApp,
} from '@/src/test/defineFunctionApp';

describe('functionDefaults', () => {
  it('applies httpContexts unless the function sets its own', () => {
    const app = makeApp({
      functionDefaults: { httpContexts: ['my', 'private'] },
    });
    app.defineFunction({ callerModuleUrl: at('functions/rest/users/get') });
    app.defineFunction({
      httpContexts: ['public'],
      callerModuleUrl: at('functions/rest/users/post'),
    });
    const out = fnsOf(app);
    expect(httpEvents(out.functions_rest_users_get)).toEqual([
      'get /my/users',
      'get /private/users',
    ]);
    expect(httpEvents(out.functions_rest_users_post)).toEqual(['post /users']);
  });

  it('applies contentType unless the function sets its own', async () => {
    const vendor = 'application/vnd.smoz+json';
    const app = makeApp({ functionDefaults: { contentType: vendor } });
    const defaulted = app
      .defineFunction({ callerModuleUrl: at('functions/rest/a/get') })
      .handler(async () => ({ ok: true }));
    const explicit = app
      .defineFunction({
        contentType: 'application/json',
        callerModuleUrl: at('functions/rest/b/get'),
      })
      .handler(async () => ({ ok: true }));

    const res = await call(defaulted, { headers: { Accept: vendor } });
    expect(res.headers['Content-Type']).toBe(vendor);
    const res2 = await call(explicit, {});
    expect(res2.headers['Content-Type']).toBe('application/json');
  });

  describe('contentType precedence', () => {
    const ct = (s: string) => `application/vnd.${s}+json`;
    // Accept every candidate so the response reports the resolved type.
    const accept = ['fd', 'app', 'fdopt', 'prof', 'own', 'ownopt']
      .map(ct)
      .join(', ');
    const typeOf = async (
      handler: (e: unknown, c: unknown) => Promise<unknown>,
    ) =>
      (await call(handler, { headers: { Accept: accept } })).headers[
        'Content-Type'
      ];
    const layered = () =>
      makeApp({
        http: {
          defaults: { contentType: ct('app') },
          profiles: { p: { contentType: ct('prof') } },
        },
        functionDefaults: {
          contentType: ct('fd'),
          http: { profile: 'p', options: { contentType: ct('fdopt') } },
        },
      });
    const ok = async () => ({ ok: true });

    it('the selected profile wins when the function sets nothing', async () => {
      const handler = layered()
        .defineFunction({ callerModuleUrl: at('functions/rest/a/get') })
        .handler(ok);
      expect(await typeOf(handler)).toBe(ct('prof'));
    });

    it("the function's own contentType beats the profile and every default", async () => {
      const handler = layered()
        .defineFunction({
          contentType: ct('own'),
          callerModuleUrl: at('functions/rest/a/get'),
        })
        .handler(ok);
      expect(await typeOf(handler)).toBe(ct('own'));
    });

    it("the function's own contentType beats app http.defaults", async () => {
      const handler = makeApp({
        http: { defaults: { contentType: ct('app') } },
      })
        .defineFunction({
          contentType: ct('own'),
          callerModuleUrl: at('functions/rest/a/get'),
        })
        .handler(ok);
      expect(await typeOf(handler)).toBe(ct('own'));
    });

    it("the function's http.options.contentType beats its own contentType", async () => {
      const handler = layered()
        .defineFunction({
          contentType: ct('own'),
          http: { options: { contentType: ct('ownopt') } },
          callerModuleUrl: at('functions/rest/a/get'),
        })
        .handler(ok);
      expect(await typeOf(handler)).toBe(ct('ownopt'));
    });

    it('functionDefaults.contentType is below app http.defaults', async () => {
      const app = makeApp({
        http: { defaults: { contentType: ct('app') } },
        functionDefaults: { contentType: ct('fd') },
      });
      const handler = app
        .defineFunction({ callerModuleUrl: at('functions/rest/a/get') })
        .handler(ok);
      expect(await typeOf(handler)).toBe(ct('app'));
    });
  });

  it('merges fnEnvKeys with the function keys', () => {
    const app = makeApp({ functionDefaults: { fnEnvKeys: ['REGION'] } });
    app.defineFunction({
      fnEnvKeys: ['STAGE'],
      callerModuleUrl: at('functions/rest/users/get'),
    });
    expect(
      Object.keys(fnsOf(app).functions_rest_users_get?.environment ?? {}),
    ).toEqual(['REGION', 'STAGE']);
  });
});
