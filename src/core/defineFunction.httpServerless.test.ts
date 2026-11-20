/* REQUIREMENTS ADDRESSED (TEST)
- Per-function `http` reaches the runtime middleware stack (#24).
- Per-function `serverless` properties merge over functionDefaults (#19).
*/
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  DefineFunctionOptions,
  FunctionServerlessConfig,
} from '@/src/core/functionOptions';
import type { FnOut } from '@/src/test/defineFunctionApp';
import {
  at,
  httpEvents,
  makeApp,
  postForm,
  sawParsedBody,
} from '@/src/test/defineFunctionApp';

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
