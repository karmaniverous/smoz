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

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { App, type AppInit } from '@/src/core/App';
import { baseEventTypeMapSchema } from '@/src/core/baseEventTypeMapSchema';
import type { FunctionDefaults } from '@/src/core/functionOptions';
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
  });
});

describe('defineFunction: per-function http (#24)', () => {
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
