/* REQUIREMENTS ADDRESSED (TEST)
- Derivation gives the same result with the app config bundled into the
  function (#29).
- A minimal definition yields the same Serverless and OpenAPI output as the
  fully explicit form.
*/
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { FunctionDefaults } from '@/src/core/functionOptions';
import type { BaseOperation } from '@/src/openapi/types';
import type { TestEnvKey } from '@/src/test/defineFunctionApp';
import {
  appRoot,
  at,
  call,
  fnsOf,
  httpEvents,
  makeApp,
} from '@/src/test/defineFunctionApp';

describe('defineFunction: app config bundled into the function (#29)', () => {
  /**
   * The `appRootAbs` the template's `APP_ROOT_ABS` (`new URL('..',
   * import.meta.url)` in app/config/app.config.ts) gets once esbuild inlines
   * the config into the bundle at `<root>/<rel>/handler.mjs`: the parent of
   * the bundle's folder.
   */
  const bundledRoot = (rel: string, root = appRoot) =>
    `${root}/${rel}`.replace(/\/[^/]+$/, '/');

  /** An app as it runs inside the bundle of the function at `<root>/<rel>`. */
  const bundledApp = (
    rel: string,
    extra: {
      functionDefaults?: FunctionDefaults<TestEnvKey>;
      root?: string;
    } = {},
  ) =>
    makeApp({
      appRootAbs: bundledRoot(rel, extra.root),
      ...(extra.functionDefaults
        ? { functionDefaults: extra.functionDefaults }
        : {}),
    });

  it('derives a minimal HTTP function as if unbundled', async () => {
    const rel = 'functions/rest/user/logo/patch';
    const app = bundledApp(rel);
    const fn = app.defineFunction({ callerModuleUrl: at(rel) });

    const out = fnsOf(app);
    expect(Object.keys(out)).toEqual(['functions_rest_user_logo_patch']);
    expect(httpEvents(out.functions_rest_user_logo_patch)).toEqual([
      'patch /user/logo',
    ]);
    const res = await call(
      fn.handler(async () => ({ ok: true })),
      { method: 'PATCH' },
    );
    expect(res.statusCode).toBe(200);
  });

  const styles: [string, FunctionDefaults['functionName']][] = [
    ['the built-in name', undefined],
    ['kebab', 'kebab'],
    [
      'a name function',
      ({ eventType, segments, defaultName }) =>
        `${eventType}.${segments.join('.')}.${defaultName}`,
    ],
  ];

  it.each(styles)(
    'resolves exactly as unbundled with %s',
    (_, functionName) => {
      const functionDefaults: FunctionDefaults<TestEnvKey> = functionName
        ? { functionName }
        : {};
      const op: BaseOperation = { summary: 'op', responses: {} };
      /** Paths and functions of an app with the one function at `rel`. */
      const outputOf = (app: ReturnType<typeof makeApp>, rel: string) => {
        const fn = app.defineFunction({ callerModuleUrl: at(rel) });
        if (rel.startsWith('functions/rest/')) fn.openapi(op);
        return {
          functions: app.buildAllServerlessFunctions(),
          paths: app.buildAllOpenApiPaths(),
        };
      };
      for (const rel of [
        'functions/rest/user/logo/patch',
        'functions/rest/users/get',
        'functions/rest/..foo/get',
        'functions/sqs/tick',
        'functions/sqs',
        'functions/custom/postConfirmation',
      ]) {
        expect(outputOf(bundledApp(rel, { functionDefaults }), rel)).toEqual(
          outputOf(makeApp({ functionDefaults }), rel),
        );
      }
    },
  );

  it('applies the kebab style to the segments under the recovered root', () => {
    const rel = 'functions/rest/user/logo/patch';
    const app = bundledApp(rel, {
      functionDefaults: { functionName: 'kebab' },
    });
    app.defineFunction({ callerModuleUrl: at(rel) });
    expect(Object.keys(fnsOf(app))).toEqual(['user-logo-patch']);
  });

  it('accepts an explicit eventType with a name style', () => {
    const rel = 'functions/rest/users/get';
    const app = bundledApp(rel, {
      functionDefaults: { functionName: 'kebab' },
    });
    app.defineFunction({ eventType: 'rest', callerModuleUrl: at(rel) });
    expect(Object.keys(fnsOf(app))).toEqual(['users-get']);
  });

  it('lets explicit values win over the recovered root', () => {
    const rel = 'functions/rest/users/get';
    const app = bundledApp(rel, {
      functionDefaults: { functionName: 'kebab' },
    });
    app.defineFunction({
      functionName: 'mine',
      callerModuleUrl: at(rel),
      endpointsRootAbs: `${appRoot}/functions`,
    });
    expect(httpEvents(fnsOf(app).mine)).toEqual(['get /rest/users']);
  });

  it('anchors on the last functions/<eventType>/ pair of a known event type', () => {
    // A project path containing functions/rest above app/, and a route
    // folder named functions followed by a folder that is no event type.
    const root = `${appRoot.replace(/\/app$/, '')}/functions/rest/proj/app`;
    const url = (rel: string) => pathToFileURL(`${root}/${rel}/lambda.ts`).href;

    const sqs = bundledApp('functions/sqs/tick', { root });
    sqs.defineFunction({ callerModuleUrl: url('functions/sqs/tick') });
    expect(Object.keys(fnsOf(sqs))).toEqual(['functions_sqs_tick']);

    const rel = 'functions/rest/users/functions/get';
    const rest = bundledApp(rel, { root });
    rest.defineFunction({ callerModuleUrl: url(rel) });
    expect(httpEvents(fnsOf(rest).functions_rest_users_functions_get)).toEqual([
      'get /users/functions',
    ]);
  });

  it('keeps an unbundled appRootAbs as the root when the caller is under its functions folder', () => {
    // The project path holds functions/rest, but the caller's own folder
    // under <appRootAbs>/functions is unknown: the unbundled error stands.
    const root = `${appRoot.replace(/\/app$/, '')}/functions/rest/proj/app`;
    const app = makeApp({ appRootAbs: root });
    expect(() =>
      app.defineFunction({
        callerModuleUrl: pathToFileURL(
          `${root}/functions/cognito/hook/lambda.ts`,
        ).href,
      }),
    ).toThrow(/folder "cognito" .* is not an event type of this app/);
  });

  it('throws when the path has no functions/<eventType>/ for a known event type', () => {
    const rel = 'functions/cognito/hook';
    const app = bundledApp(rel);
    expect(() => app.defineFunction({ callerModuleUrl: at(rel) })).toThrow(
      /cannot derive eventType .* has no functions\/<eventType>\/ folder for an event type of this app \(known: rest, .*custom\)\. .*pass eventType explicitly/,
    );
  });

  it('does not recover a root when appRootAbs is outside it', () => {
    // appRootAbs set above the real app folder (not a bundle): the built-in
    // name stays relative to appRootAbs and derivation still fails.
    const base = appRoot.replace(/\/app$/, '');
    const caller = pathToFileURL(
      `${base}/src/functions/rest/users/get/lambda.ts`,
    ).href;
    const app = makeApp({ appRootAbs: base });
    app.defineFunction({
      eventType: 'rest',
      method: 'get',
      basePath: 'users',
      callerModuleUrl: caller,
    });
    expect(Object.keys(fnsOf(app))).toEqual(['src_functions_rest_users_get']);
    expect(() =>
      makeApp({ appRootAbs: base }).defineFunction({ callerModuleUrl: caller }),
    ).toThrow(`not under ${base}/functions/<eventType>/, and`);
  });

  it('recovers a filesystem or drive root', () => {
    const drive = process.platform === 'win32' ? 'C:' : '';
    const rel = 'functions/rest/users/get';
    const app = bundledApp(rel, { root: drive });
    app.defineFunction({
      callerModuleUrl: pathToFileURL(`${drive}/${rel}/lambda.ts`).href,
    });
    expect(httpEvents(fnsOf(app).functions_rest_users_get)).toEqual([
      'get /users',
    ]);
  });

  // Only Windows has UNC roots: on POSIX '//server' is just '/server'.
  it.runIf(process.platform === 'win32')(
    'derives under a UNC root, bundled or not',
    () => {
      const root = '//server/share/app';
      const rel = 'functions/rest/users/get';
      const callerModuleUrl = pathToFileURL(`${root}/${rel}/lambda.ts`).href;
      for (const app of [
        makeApp({
          appRootAbs: root,
          functionDefaults: { functionName: 'kebab' },
        }),
        bundledApp(rel, { root, functionDefaults: { functionName: 'kebab' } }),
      ]) {
        app.defineFunction({ callerModuleUrl });
        expect(httpEvents(fnsOf(app)['users-get'])).toEqual(['get /users']);
      }
    },
  );
});

describe('defineFunction: minimal form matches the explicit form', () => {
  const op: BaseOperation = { summary: 'Get users', responses: {} };
  const eventSchema = z.object({});
  const responseSchema = z.object({ ok: z.boolean() });

  it('produces identical Serverless and OpenAPI output', () => {
    const callerModuleUrl = at('functions/rest/users/get');

    const minimal = makeApp();
    minimal
      .defineFunction({ eventSchema, responseSchema, callerModuleUrl })
      .openapi(op);

    const explicit = makeApp();
    explicit
      .defineFunction({
        functionName: 'functions_rest_users_get',
        eventType: 'rest',
        method: 'get',
        basePath: 'users',
        httpContexts: ['public'],
        contentType: 'application/json',
        eventSchema,
        responseSchema,
        callerModuleUrl,
        endpointsRootAbs: `${appRoot}/functions/rest`,
      })
      .openapi(op);

    expect(minimal.buildAllServerlessFunctions()).toEqual(
      explicit.buildAllServerlessFunctions(),
    );
    expect(minimal.buildAllOpenApiPaths()).toEqual(
      explicit.buildAllOpenApiPaths(),
    );
    expect(Object.keys(minimal.buildAllOpenApiPaths())).toEqual(['/users']);
  });
});
