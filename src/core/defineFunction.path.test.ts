/* REQUIREMENTS ADDRESSED (TEST)
- defineFunction derives eventType and endpointsRootAbs from the caller's path
  under <appRootAbs>/functions/<eventType>/, with actionable errors.
*/
import { pathToFileURL } from 'node:url';

import type { SQSEvent } from 'aws-lambda';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import { createLambdaContext } from '@/src/test/aws';
import type { eventTypeMapSchema } from '@/src/test/defineFunctionApp';
import {
  appRoot,
  at,
  call,
  fnsOf,
  httpEvents,
  makeApp,
} from '@/src/test/defineFunctionApp';

describe('defineFunction: eventType and endpointsRootAbs from the path', () => {
  it('derives an HTTP function from functions/rest/<path>/<method>', async () => {
    const app = makeApp();
    const fn = app.defineFunction({
      callerModuleUrl: at('functions/rest/user/logo/patch'),
    });

    const out = fnsOf(app);
    expect(Object.keys(out)).toEqual(['functions_rest_user_logo_patch']);
    expect(httpEvents(out.functions_rest_user_logo_patch)).toEqual([
      'patch /user/logo',
    ]);

    // Derived eventType 'rest' is HTTP: the response is shaped by the stack.
    const handler = fn.handler(async () => ({ ok: true }));
    const res = await call(handler, { method: 'PATCH' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('derives a non-HTTP function from functions/<eventType>/...', async () => {
    const app = makeApp();
    const fn = app.defineFunction({
      callerModuleUrl: at('functions/sqs/tick'),
    });
    const extras = [{ sqs: { arn: 'arn:queue' } }];
    fn.serverless(extras);

    expect(fnsOf(app).functions_sqs_tick?.events).toEqual(extras);
    // Derived eventType 'sqs' is non-HTTP: business result returned as is.
    const handler = fn.handler(async () => ({ handled: 1 }));
    expect(await handler({ Records: [] }, createLambdaContext())).toEqual({
      handled: 1,
    });
  });

  it('types the event from a literal eventType and widens it when derived', async () => {
    const app = makeApp();
    const literal = app.defineFunction({
      eventType: 'sqs',
      callerModuleUrl: at('functions/sqs/a'),
    });
    const derived = app.defineFunction({
      callerModuleUrl: at('functions/sqs/b'),
    });
    type EventOf<F extends { handler: (business: never) => unknown }> =
      Parameters<Parameters<F['handler']>[0]>[0];
    type EventMap = z.infer<typeof eventTypeMapSchema>;

    expectTypeOf<EventOf<typeof literal>>().toEqualTypeOf<SQSEvent>();
    expectTypeOf<EventOf<typeof derived>>().toEqualTypeOf<
      (EventMap & BaseEventTypeMap)[keyof EventMap]
    >();

    // At runtime both are SQS functions: the event reaches the handler as is.
    const evt = { Records: [] };
    const echo = async (e: unknown) => e;
    expect(await literal.handler(echo)(evt, createLambdaContext())).toBe(evt);
    expect(await derived.handler(echo)(evt, createLambdaContext())).toBe(evt);
  });

  it('accepts a folder that is a custom key of eventTypeMapSchema', () => {
    const app = makeApp();
    app.defineFunction({ callerModuleUrl: at('functions/custom/job') });
    expect(Object.keys(fnsOf(app))).toEqual(['functions_custom_job']);
  });

  it('throws when the caller is outside <appRootAbs>/functions', () => {
    const app = makeApp();
    expect(() =>
      app.defineFunction({ callerModuleUrl: at('lib/users/get') }),
    ).toThrow(
      /cannot derive eventType.*not under .*\/functions\/<eventType>\/.*smoz\/no-cross-function-imports/,
    );
  });

  // Only Windows has drive letters: path.relative across drives returns an
  // absolute path instead of a '..' path.
  it.runIf(process.platform === 'win32')(
    'throws when the caller is on another drive',
    () => {
      const app = makeApp();
      expect(() =>
        app.defineFunction({
          callerModuleUrl: pathToFileURL(
            'D:/elsewhere/functions/rest/users/get/lambda.ts',
          ).href,
        }),
      ).toThrow(/cannot derive eventType/);
    },
  );

  it('normalizes a trailing slash on appRootAbs (as the template sets it)', () => {
    const app = makeApp({
      appRootAbs: `${appRoot}/`,
      functionDefaults: { functionName: 'kebab' },
    });
    expect(() =>
      app.defineFunction({
        eventType: 'rest',
        callerModuleUrl: at('lib/users/get'),
      }),
    ).toThrow(`not under ${appRoot}/functions/rest.`);
    expect(() =>
      app.defineFunction({ callerModuleUrl: at('lib/users/get') }),
    ).toThrow(`not under ${appRoot}/functions/<eventType>/, and`);
  });

  it('throws when the caller sits directly in <appRootAbs>/functions', () => {
    const app = makeApp();
    expect(() =>
      app.defineFunction({ callerModuleUrl: at('functions') }),
    ).toThrow(/cannot derive eventType/);
  });

  it('throws when the folder is not an event type of the app', () => {
    const app = makeApp();
    expect(() =>
      app.defineFunction({ callerModuleUrl: at('functions/cognito/hook') }),
    ).toThrow(
      /folder "cognito" .* is not an event type of this app \(known: rest, http, .*custom\)/,
    );
  });

  describe('HTTP route of a derived eventType', () => {
    it.each([
      ['directly in functions/rest', 'functions/rest', /cannot infer method/],
      [
        'in a folder that is not a method',
        'functions/rest/users',
        /cannot infer method/,
      ],
    ])('throws at definition when the file is %s', (_, rel, cause) => {
      const app = makeApp();
      const define = () => app.defineFunction({ callerModuleUrl: at(rel) });
      expect(define).toThrow(
        /defineFunction: cannot derive the HTTP route for .* \(eventType "rest" from its folder\)/,
      );
      expect(define).toThrow(cause);
      expect(define).toThrow(
        /Put the file in functions\/rest\/<path>\/<method>\/ .* or pass method and basePath explicitly\./,
      );
    });

    it('throws when only the method is given and the base path is empty', () => {
      const app = makeApp();
      expect(() =>
        app.defineFunction({
          method: 'get',
          callerModuleUrl: at('functions/rest'),
        }),
      ).toThrow(/cannot derive the HTTP route.*derived basePath is empty/);
    });

    it('accepts an explicit basePath where the derived one is empty', () => {
      const app = makeApp();
      app.defineFunction({
        basePath: 'status',
        callerModuleUrl: at('functions/rest/get'),
      });
      expect(httpEvents(fnsOf(app).functions_rest_get)).toEqual([
        'get /status',
      ]);
    });

    it('throws when the caller is outside an explicit endpointsRootAbs', () => {
      const app = makeApp();
      expect(() =>
        app.defineFunction({
          method: 'get',
          callerModuleUrl: at('functions/rest/users'),
          endpointsRootAbs: `${appRoot}/functions/other`,
        }),
      ).toThrow(
        /cannot derive the HTTP route.*basePath missing and caller is not under endpoints root/,
      );
    });

    it('accepts an explicit method for a folder that is not a method', () => {
      const app = makeApp();
      app.defineFunction({
        method: 'get',
        callerModuleUrl: at('functions/rest/users'),
      });
      expect(httpEvents(fnsOf(app).functions_rest_users)).toEqual([
        'get /users',
      ]);
    });

    it('keeps the old fallback when eventType is explicit', () => {
      const app = makeApp();
      app.defineFunction({
        eventType: 'rest',
        callerModuleUrl: at('functions/rest/users'),
      });
      expect(fnsOf(app).functions_rest_users?.events).toEqual([]);
    });

    it('does not check non-HTTP functions', () => {
      const app = makeApp();
      // No method folder, no route: fine for an SQS function.
      app.defineFunction({ callerModuleUrl: at('functions/sqs') });
      expect(fnsOf(app).functions_sqs?.events).toEqual([]);
    });

    it("derives a route under a folder whose name starts with '..'", () => {
      const app = makeApp({ functionDefaults: { functionName: 'kebab' } });
      app.defineFunction({ callerModuleUrl: at('functions/rest/..foo/get') });
      expect(httpEvents(fnsOf(app)['..foo-get'])).toEqual(['get /..foo']);
    });
  });

  it('lets an explicit eventType win over the folder', async () => {
    const app = makeApp();
    const fn = app.defineFunction({
      eventType: 'sqs',
      callerModuleUrl: at('functions/rest/users/get'),
    });
    const handler = fn.handler(async () => 'raw');
    expect(await handler({}, createLambdaContext())).toBe('raw');
  });

  it('needs no derivation when eventType is explicit outside functions/', () => {
    const app = makeApp();
    app.defineFunction({
      eventType: 'rest',
      method: 'get',
      basePath: 'elsewhere',
      callerModuleUrl: at('lib/elsewhere'),
    });
    expect(httpEvents(fnsOf(app).lib_elsewhere)).toEqual(['get /elsewhere']);
  });

  it("keeps the built-in name, dropping a leading 'app' folder", () => {
    const app = makeApp({ appRootAbs: appRoot.replace(/\/app$/, '') });
    app.defineFunction({
      eventType: 'rest',
      callerModuleUrl: at('functions/rest/users/get'),
      endpointsRootAbs: `${appRoot}/functions/rest`,
    });
    expect(Object.keys(fnsOf(app))).toEqual(['functions_rest_users_get']);
  });

  it('lets an explicit endpointsRootAbs win over the derived root', () => {
    const app = makeApp();
    app.defineFunction({
      callerModuleUrl: at('functions/rest/users/get'),
      endpointsRootAbs: `${appRoot}/functions`,
    });
    expect(httpEvents(fnsOf(app).functions_rest_users_get)).toEqual([
      'get /rest/users',
    ]);
  });
});
