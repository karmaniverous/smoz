/* REQUIREMENTS ADDRESSED (TEST)
- defineFunction derives eventType and endpointsRootAbs from the caller's path
  under <appRootAbs>/functions/<eventType>/, with actionable errors.
- functionDefaults (httpContexts, contentType, http, fnEnvKeys, functionName)
  apply with precedence explicit > functionDefaults > built-in.
- Per-function `http` reaches the runtime middleware stack (#24).
- A minimal definition yields the same Serverless and OpenAPI output as the
  fully explicit form.
*/
import { pathToFileURL } from 'node:url';

import type { SQSEvent } from 'aws-lambda';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { App, type AppInit } from '@/src/core/App';
import {
  type BaseEventTypeMap,
  baseEventTypeMapSchema,
} from '@/src/core/baseEventTypeMapSchema';
import type {
  DefineFunctionOptions,
  FunctionDefaults,
  FunctionServerlessConfig,
} from '@/src/core/functionOptions';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import type { BaseOperation } from '@/src/openapi/types';
import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';
import type { HttpResponse } from '@/src/test/http';
import {
  formParts,
  multipartBody,
  multipartContentType,
} from '@/src/test/multipart';

const appRoot =
  process.platform === 'win32' ? 'C:/tmp/sandbox/app' : '/tmp/sandbox/app';

/** File URL of a lambda module at `<appRoot>/<rel>/lambda.ts`. */
const at = (rel: string) => pathToFileURL(`${appRoot}/${rel}/lambda.ts`).href;

const globalParamsSchema = z.object({ REGION: z.string() });
const stageParamsSchema = z.object({ STAGE: z.string() });
const eventTypeMapSchema = baseEventTypeMapSchema.extend({
  custom: z.unknown(),
});

const makeApp = (
  extra: {
    appRootAbs?: string;
    functionDefaults?: FunctionDefaults;
    http?: AppHttpConfig;
  } = {},
) =>
  App.create({
    appRootAbs: appRoot,
    globalParamsSchema,
    stageParamsSchema,
    eventTypeMapSchema,
    serverless: {
      httpContextEventMap: {
        my: { authorizer: { name: 'auth' } },
        private: { private: true },
        public: {},
      },
      defaultHandlerFileName: 'handler',
      defaultHandlerFileExport: 'handler',
    },
    global: { params: { REGION: 'us-east-1' }, envKeys: [] },
    stage: { params: { dev: { STAGE: 'dev' } }, envKeys: [] },
    ...extra,
  } satisfies AppInit<
    typeof globalParamsSchema,
    typeof stageParamsSchema,
    typeof eventTypeMapSchema
  >);

type FnOut = {
  handler: string;
  events: { http?: Record<string, unknown> }[];
  environment: Record<string, string>;
};
const fnsOf = (app: ReturnType<typeof makeApp>) =>
  app.buildAllServerlessFunctions() as unknown as Record<string, FnOut>;

const httpEvents = (fn: FnOut | undefined) =>
  (fn?.events ?? []).map(
    (e) => `${String(e.http?.method)} ${String(e.http?.path)}`,
  );

const call = async (
  handler: (e: unknown, c: unknown) => Promise<unknown>,
  init: { method?: string; headers?: Record<string, string>; body?: string },
) => {
  const evt = createApiGatewayV1Event(init.method ?? 'GET', {
    Accept: 'application/json',
    ...init.headers,
  });
  if (init.body !== undefined) evt.body = init.body;
  return (await handler(evt, createLambdaContext())) as HttpResponse;
};

/** POST a multipart form; returns what the handler saw as `body.name` (or the raw body). */
const postForm = async (
  handler: (e: unknown, c: unknown) => Promise<unknown>,
) => {
  const res = await call(handler, {
    method: 'POST',
    headers: { 'Content-Type': multipartContentType },
    body: multipartBody(formParts),
  });
  return JSON.parse(res.body) as { parsed: boolean };
};

/** Business handler reporting whether the body arrived parsed. */
const sawParsedBody = async (event: unknown) => {
  const body = (event as { body?: unknown }).body;
  return {
    parsed:
      typeof body === 'object' &&
      (body as Record<string, unknown> | null)?.name === 'Aris',
  };
};

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
      /cannot derive eventType.*not under .*\/functions\/<eventType>\//,
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
    ).toThrow(`not under ${appRoot}/functions/<eventType>/.`);
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

  describe('functionName', () => {
    it("'kebab' names from the segments under endpointsRootAbs", () => {
      const app = makeApp({ functionDefaults: { functionName: 'kebab' } });
      app.defineFunction({
        callerModuleUrl: at('functions/rest/user/logo/patch'),
      });
      app.defineFunction({
        callerModuleUrl: at('functions/custom/postConfirmation'),
      });
      expect(Object.keys(fnsOf(app))).toEqual([
        'user-logo-patch',
        'post-confirmation',
      ]);
    });

    it('calls a name function with eventType, segments and the default name', () => {
      const seen: unknown[] = [];
      const app = makeApp({
        functionDefaults: {
          functionName: (ctx) => {
            seen.push(ctx);
            return `svc-${ctx.segments.join('.')}`;
          },
        },
      });
      app.defineFunction({ callerModuleUrl: at('functions/rest/users/get') });
      expect(seen).toEqual([
        {
          eventType: 'rest',
          segments: ['users', 'get'],
          defaultName: 'functions_rest_users_get',
        },
      ]);
      expect(Object.keys(fnsOf(app))).toEqual(['svc-users.get']);
    });

    it('lets an explicit functionName win over the style', () => {
      const app = makeApp({ functionDefaults: { functionName: 'kebab' } });
      app.defineFunction({
        functionName: 'mine',
        callerModuleUrl: at('functions/rest/users/get'),
      });
      expect(Object.keys(fnsOf(app))).toEqual(['mine']);
    });

    it('throws when the caller is not under endpointsRootAbs', () => {
      const app = makeApp({ functionDefaults: { functionName: 'kebab' } });
      expect(() =>
        app.defineFunction({
          callerModuleUrl: at('functions/custom/job'),
          endpointsRootAbs: `${appRoot}/functions/other`,
        }),
      ).toThrow(
        /cannot apply functionDefaults\.functionName .* Pass functionName explicitly/,
      );
    });
  });

  describe('http', () => {
    const uploads: AppHttpConfig = {
      profiles: { uploads: { multipartBodyParser: {} }, plain: {} },
    };

    it('applies to a function without its own http', async () => {
      const app = makeApp({
        functionDefaults: { http: { options: { multipartBodyParser: {} } } },
      });
      const handler = app
        .defineFunction({ callerModuleUrl: at('functions/rest/form/post') })
        .handler(sawParsedBody);
      expect(await postForm(handler)).toEqual({ parsed: true });
    });

    it('shallow-merges options, function keys winning', async () => {
      const app = makeApp({
        functionDefaults: {
          http: {
            options: {
              multipartBodyParser: {},
              contentType: 'application/vnd.smoz+json',
            },
          },
        },
      });
      const optedOut = app
        .defineFunction({
          http: { options: { multipartBodyParser: false } },
          callerModuleUrl: at('functions/rest/form/post'),
        })
        .handler(sawParsedBody);
      const res = await call(optedOut, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.smoz+json',
          'Content-Type': multipartContentType,
        },
        body: multipartBody(formParts),
      });
      // Function key wins (no parsing) and the default key survives.
      expect(JSON.parse(res.body)).toEqual({ parsed: false });
      expect(res.headers['Content-Type']).toBe('application/vnd.smoz+json');
    });

    it('never overrides the profile the function selects', async () => {
      const app = makeApp({
        http: uploads,
        functionDefaults: { http: { options: { multipartBodyParser: false } } },
      });
      const chosen = app
        .defineFunction({
          http: { profile: 'uploads' },
          callerModuleUrl: at('functions/rest/a/post'),
        })
        .handler(sawParsedBody);
      const optedOut = app
        .defineFunction({
          http: {
            profile: 'uploads',
            options: { multipartBodyParser: false },
          },
          callerModuleUrl: at('functions/rest/b/post'),
        })
        .handler(sawParsedBody);
      // Profile option beats the default; the function's own option beats both.
      expect(await postForm(chosen)).toEqual({ parsed: true });
      expect(await postForm(optedOut)).toEqual({ parsed: false });
    });

    it('lets the function profile win over the default profile', async () => {
      const app = makeApp({
        http: uploads,
        functionDefaults: { http: { profile: 'plain' } },
      });
      const defaulted = app
        .defineFunction({ callerModuleUrl: at('functions/rest/a/post') })
        .handler(sawParsedBody);
      const chosen = app
        .defineFunction({
          http: { profile: 'uploads' },
          callerModuleUrl: at('functions/rest/b/post'),
        })
        .handler(sawParsedBody);
      expect(await postForm(defaulted)).toEqual({ parsed: false });
      expect(await postForm(chosen)).toEqual({ parsed: true });
    });

    it('throws at definition for an unknown functionDefaults.http.profile', () => {
      const app = makeApp({
        http: uploads,
        functionDefaults: { http: { profile: 'upload' } },
      });
      expect(() =>
        app.defineFunction({ callerModuleUrl: at('functions/rest/a/post') }),
      ).toThrow(
        `Unknown HTTP profile "upload" (functionDefaults.http.profile) on function 'functions_rest_a_post'. Known profiles: uploads, plain.`,
      );
    });

    it('is ignored by non-HTTP functions', async () => {
      // Every part of this default would break an HTTP function.
      const stack = {
        before: () => {
          throw new Error('HTTP stack ran');
        },
      };
      const app = makeApp({
        functionDefaults: {
          http: { profile: 'missing', replace: { stack } },
          contentType: 'text/plain',
        },
      });
      const handler = app
        .defineFunction({ callerModuleUrl: at('functions/sqs/tick') })
        .handler(async () => 'raw');
      expect(await handler({ Records: [] }, createLambdaContext())).toBe('raw');
      expect(() =>
        app.defineFunction({ callerModuleUrl: at('functions/rest/a/get') }),
      ).toThrow(/Unknown HTTP profile "missing"/);
    });
  });
});

describe('defineFunction: per-function http (#24)', () => {
  it('throws at definition for an unknown profile, naming the known ones', () => {
    const app = makeApp({ http: { profiles: { uploads: {} } } });
    expect(() =>
      app.defineFunction({
        http: { profile: 'upload' },
        callerModuleUrl: at('functions/rest/form/post'),
      }),
    ).toThrow(
      `Unknown HTTP profile "upload" (http.profile) on function 'functions_rest_form_post'. Known profiles: uploads. ` +
        'Define it in App.create({ http: { profiles } }) or fix the name.',
    );
    expect(() =>
      makeApp().defineFunction({
        http: { profile: 'upload' },
        callerModuleUrl: at('functions/rest/form/post'),
      }),
    ).toThrow('Known profiles: (none).');
  });

  it('selects an app profile', async () => {
    const app = makeApp({
      http: { profiles: { uploads: { multipartBodyParser: {} } } },
    });
    const handler = app
      .defineFunction({
        http: { profile: 'uploads' },
        callerModuleUrl: at('functions/rest/form/post'),
      })
      .handler(sawParsedBody);
    expect(await postForm(handler)).toEqual({ parsed: true });
  });

  it('applies per-function options', async () => {
    const app = makeApp();
    const handler = app
      .defineFunction({
        http: { options: { multipartBodyParser: {} } },
        callerModuleUrl: at('functions/rest/form/post'),
      })
      .handler(sawParsedBody);
    expect(await postForm(handler)).toEqual({ parsed: true });
    // Warm invocation reuses the built stack, options included.
    expect(await postForm(handler)).toEqual({ parsed: true });
  });

  it('leaves a function without http unchanged', async () => {
    const app = makeApp({
      http: { profiles: { uploads: { multipartBodyParser: {} } } },
    });
    const handler = app
      .defineFunction({ callerModuleUrl: at('functions/rest/form/post') })
      .handler(sawParsedBody);
    expect(await postForm(handler)).toEqual({ parsed: false });
  });
});

describe('defineFunction: serverless (#19)', () => {
  type Def = Record<string, unknown> & { image?: unknown };
  const defsOf = (app: ReturnType<typeof makeApp>) =>
    app.buildAllServerlessFunctions() as unknown as Record<string, Def>;
  const users = 'functions/rest/users/get';
  const usersName = 'functions_rest_users_get';

  /** The handler SMOZ derives for `users` (from an app with no serverless config). */
  const derivedHandler = () => {
    const app = makeApp();
    app.defineFunction({ callerModuleUrl: at(users) });
    return defsOf(app)[usersName]!.handler as string;
  };

  it('passes Lambda properties through next to the SMOZ-owned keys', () => {
    const app = makeApp();
    app.defineFunction({
      serverless: {
        memorySize: 1024,
        timeout: 60,
        tenancy: { mode: 'PER_TENANT' },
      },
      fnEnvKeys: ['REGION'],
      callerModuleUrl: at(users),
    });
    const def = defsOf(app)[usersName]!;
    expect(def).toMatchObject({
      memorySize: 1024,
      timeout: 60,
      tenancy: { mode: 'PER_TENANT' },
      handler: derivedHandler(),
      environment: { REGION: '${param:REGION}' },
    });
    expect(httpEvents(def as unknown as FnOut)).toEqual(['get /users']);
  });

  it('leaves a function without serverless config unchanged', () => {
    const app = makeApp();
    app.defineFunction({ callerModuleUrl: at(users) });
    expect(Object.keys(defsOf(app)[usersName]!).sort()).toEqual([
      'environment',
      'events',
      'handler',
    ]);
  });

  it('keeps handler, events and environment SMOZ-owned', () => {
    // Excluded from the type...
    expectTypeOf<FunctionServerlessConfig>().not.toHaveProperty('handler');
    expectTypeOf<FunctionServerlessConfig>().not.toHaveProperty('events');
    expectTypeOf<FunctionServerlessConfig>().not.toHaveProperty('environment');
    expectTypeOf<FunctionServerlessConfig>().toHaveProperty('memorySize');
    expectTypeOf<DefineFunctionOptions['serverless']>().toEqualTypeOf<
      FunctionServerlessConfig | undefined
    >();

    // ...and ignored at runtime if a cast smuggles them in.
    const app = makeApp();
    const fn = app.defineFunction({
      serverless: {
        handler: 'evil.handler',
        events: [{ sqs: { arn: 'arn:evil' } }],
        environment: { EVIL: '1' },
        timeout: 5,
      } as FunctionServerlessConfig,
      callerModuleUrl: at('functions/sqs/tick'),
    });
    fn.serverless([{ sqs: { arn: 'arn:queue' } }]);
    const app2 = makeApp();
    app2.defineFunction({ callerModuleUrl: at('functions/sqs/tick') });

    expect(defsOf(app).functions_sqs_tick).toEqual({
      ...defsOf(app2).functions_sqs_tick,
      events: [{ sqs: { arn: 'arn:queue' } }],
      timeout: 5,
    });

    // An image function never emits a handler, smuggled or not.
    const app3 = makeApp();
    app3.defineFunction({
      serverless: {
        handler: 'evil.handler',
        image: 'repo:tag',
      } as FunctionServerlessConfig,
      callerModuleUrl: at(users),
    });
    expect(defsOf(app3)[usersName]).not.toHaveProperty('handler');
  });

  describe('container image', () => {
    it('omits handler and defaults image.command to the derived handler', () => {
      const app = makeApp();
      app.defineFunction({
        serverless: { image: { uri: 'acct.dkr.ecr/repo:tag' } },
        callerModuleUrl: at(users),
      });
      const def = defsOf(app)[usersName]!;
      expect(def).not.toHaveProperty('handler');
      expect(def.image).toEqual({
        uri: 'acct.dkr.ecr/repo:tag',
        command: [derivedHandler()],
      });
      expect(httpEvents(def as unknown as FnOut)).toEqual(['get /users']);
    });

    it('keeps an explicit image.command', () => {
      const app = makeApp();
      const image = { name: 'app', command: ['dist/main.handler'] };
      app.defineFunction({
        serverless: { image },
        callerModuleUrl: at(users),
      });
      const def = defsOf(app)[usersName]!;
      expect(def).not.toHaveProperty('handler');
      expect(def.image).toEqual(image);
    });

    it('leaves a string image as is', () => {
      const app = makeApp();
      app.defineFunction({
        serverless: { image: 'acct.dkr.ecr/repo@sha256:abc' },
        callerModuleUrl: at(users),
      });
      const def = defsOf(app)[usersName]!;
      expect(def).not.toHaveProperty('handler');
      expect(def.image).toBe('acct.dkr.ecr/repo@sha256:abc');
    });
  });

  it('shallow-merges functionDefaults.serverless under the function value', () => {
    const app = makeApp({
      functionDefaults: {
        serverless: { memorySize: 512, timeout: 10, tracing: 'Active' },
      },
    });
    app.defineFunction({
      serverless: { timeout: 30, tenancy: { mode: 'PER_TENANT' } },
      callerModuleUrl: at(users),
    });
    app.defineFunction({ callerModuleUrl: at('functions/sqs/tick') });
    const defs = defsOf(app);
    expect(defs[usersName]).toMatchObject({
      memorySize: 512,
      timeout: 30,
      tracing: 'Active',
      tenancy: { mode: 'PER_TENANT' },
    });
    expect(defs.functions_sqs_tick).toMatchObject({
      memorySize: 512,
      timeout: 10,
      tracing: 'Active',
    });
  });

  it('merges image objects one level deep, function keys winning', () => {
    const uri = 'acct.dkr.ecr/repo:tag';
    const app = makeApp({
      functionDefaults: {
        serverless: { image: { uri, workingDirectory: '/var/task' } },
      },
    });
    app.defineFunction({
      serverless: {
        image: { command: ['dist/a.handler'], workingDirectory: '/app' },
      },
      callerModuleUrl: at(users),
    });
    app.defineFunction({
      serverless: { image: 'other:tag' },
      callerModuleUrl: at('functions/rest/users/post'),
    });
    app.defineFunction({ callerModuleUrl: at('functions/rest/users/put') });
    const defs = defsOf(app);
    expect(defs[usersName]!.image).toEqual({
      uri,
      command: ['dist/a.handler'],
      workingDirectory: '/app',
    });
    // A string replaces the default object; no own image keeps the default.
    expect(defs.functions_rest_users_post!.image).toBe('other:tag');
    expect(defs.functions_rest_users_put!.image).toEqual({
      uri,
      workingDirectory: '/var/task',
      command: [derivedHandler().replace('/get/', '/put/')],
    });

    // An object never merges into a default string.
    const app2 = makeApp({
      functionDefaults: { serverless: { image: 'default:tag' } },
    });
    const image = { uri, command: ['dist/a.handler'] };
    app2.defineFunction({ serverless: { image }, callerModuleUrl: at(users) });
    expect(defsOf(app2)[usersName]!.image).toEqual(image);
  });
});
