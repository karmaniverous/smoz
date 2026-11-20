/* REQUIREMENTS ADDRESSED (TEST)
- #39 D3: options.env is typed as exactly the keys the runtime parses: the
  app's global and stage envKeys, functionDefaults.fnEnvKeys and the
  function's fnEnvKeys, each typed from its params schema, with no `as const`.
*/
import { describe, expect, expectTypeOf, it } from 'vitest';

import { App } from '@/src/core/App';
import { createLambdaContext } from '@/src/test/aws';
import { globalParamsSchema } from '@/src/test/serverless/config/global';
import { serverlessConfig } from '@/src/test/serverless/config/serverlessConfig';
import { stageParamsSchema } from '@/src/test/serverless/config/stage';
import { devStageParams } from '@/src/test/serverless/config/stages/dev';
import type { FunctionEnv } from '@/src/types/FunctionEnv';

const root = process.cwd().replace(/\\/g, '/');

/** An app whose env key lists are plain array literals (no `as const`). */
const makeApp = () =>
  App.create({
    appRootAbs: root,
    globalParamsSchema,
    stageParamsSchema,
    serverless: serverlessConfig,
    global: {
      params: {
        ESB_MINIFY: false,
        ESB_SOURCEMAP: true,
        PROFILE: 'dev',
        REGION: 'us-east-1',
        SERVICE_NAME: 'svc',
      },
      envKeys: ['REGION'],
    },
    stage: { params: { dev: devStageParams }, envKeys: ['STAGE'] },
    functionDefaults: { fnEnvKeys: ['PROFILE'] },
  });

type EnvOf<F extends { handler: (business: never) => unknown }> = Parameters<
  Parameters<F['handler']>[0]
>[2] extends { env: infer E }
  ? E
  : never;

/** Assert on the `options.env` type of a defined function. */
const envOf = <F extends { handler: (business: never) => unknown }>(fn: F) => {
  expect(typeof fn.handler).toBe('function');
  return expectTypeOf<EnvOf<F>>();
};

describe('options.env typing (#39 D3)', () => {
  it('types exactly the app, default and function env keys', async () => {
    const app = makeApp();
    const fn = app.defineFunction({
      functionName: 'env_typed',
      eventType: 'sqs',
      fnEnvKeys: ['DOMAIN_NAME'],
      callerModuleUrl: import.meta.url,
      endpointsRootAbs: root,
    });
    envOf(fn).toEqualTypeOf<{
      REGION: string;
      STAGE: string;
      PROFILE: string;
      DOMAIN_NAME: string;
    }>();

    // The runtime parses the same keys.
    Object.assign(process.env, {
      REGION: 'r',
      STAGE: 's',
      PROFILE: 'p',
      DOMAIN_NAME: 'd',
      SERVICE_NAME: 'not-exposed',
    });
    const env = await fn.handler(async (_e, _c, { env }) => env)(
      { Records: [] },
      createLambdaContext(),
    );
    expect(env).toEqual({
      REGION: 'r',
      STAGE: 's',
      PROFILE: 'p',
      DOMAIN_NAME: 'd',
    });
  });

  it('omits the function keys when fnEnvKeys is absent', () => {
    const fn = makeApp().defineFunction({
      functionName: 'env_default',
      eventType: 'sqs',
      callerModuleUrl: import.meta.url,
      endpointsRootAbs: root,
    });
    envOf(fn).toEqualTypeOf<{
      REGION: string;
      STAGE: string;
      PROFILE: string;
    }>();
  });
});

describe('FunctionEnv', () => {
  type G = { REGION: string; DEBUG: boolean; SHARED: number };
  type S = { STAGE: string; SHARED: string };

  it('types each key from the params that declare it, global first', () => {
    expectTypeOf<
      FunctionEnv<G, S, 'DEBUG' | 'STAGE' | 'SHARED'>
    >().toEqualTypeOf<{ DEBUG: boolean; STAGE: string; SHARED: number }>();
  });

  it('holds only the selected keys', () => {
    expectTypeOf<FunctionEnv<G, S, 'STAGE'>>().toEqualTypeOf<{
      STAGE: string;
    }>();
  });
});
