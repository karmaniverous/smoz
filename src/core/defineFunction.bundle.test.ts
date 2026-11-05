/* REQUIREMENTS ADDRESSED (TEST)
- Path derivation works inside a deployed Lambda bundle (#29): esbuild
  inlines app.config.ts into each function bundle, so the template's
  APP_ROOT_ABS resolves inside the bundle's folder. Minimal, name-style and
  explicit-eventType definitions still resolve at cold start.
*/
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';
import type { HttpResponse } from '@/src/test/http';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

/** App init shared by both configs, with the template's APP_ROOT_ABS. */
const baseConfig = `
import { fileURLToPath } from 'node:url';
import { toPosixPath } from '@karmaniverous/smoz';
import { z } from 'zod';

// As in the template: the parent directory of app/config/.
export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);

export const appInit = {
  appRootAbs: APP_ROOT_ABS,
  globalParamsSchema: z.object({ REGION: z.string() }),
  stageParamsSchema: z.object({ STAGE: z.string() }),
  serverless: {
    httpContextEventMap: { my: {}, private: { private: true }, public: {} },
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
  },
  global: { params: { REGION: 'us-east-1' }, envKeys: [] },
  stage: { params: { dev: { STAGE: 'dev' } }, envKeys: [] },
};
`;

const config = (functionDefaults: string) => `
import { App } from '@karmaniverous/smoz';
import { appInit } from './base';

export const app = App.create({ ...appInit, ${functionDefaults} });
`;

/** A function at app/functions/<rel>: lambda.ts plus handler.ts. */
interface Fixture {
  rel: string;
  config: 'app' | 'kebab';
  options?: string;
}

const fixtures: Record<string, Fixture> = {
  minimal: { rel: 'rest/hello/get', config: 'app' },
  kebab: { rel: 'rest/userLogo/get', config: 'kebab' },
  explicitEventType: {
    rel: 'rest/explicit/post',
    config: 'kebab',
    options: "eventType: 'rest',",
  },
  nonHttp: { rel: 'sqs/tick', config: 'app' },
};

const lambdaSource = ({ rel, config: cfg, options = '' }: Fixture) => {
  const up = '../'.repeat(rel.split('/').length + 1);
  return `
import { app } from '${up}config/${cfg}.config';

export const fn = app.defineFunction({ ${options} callerModuleUrl: import.meta.url });
`;
};

const handlerSource = `
import { fn } from './lambda';

export const handler = fn.handler(async () => ({ ok: true }));
`;

let tmp: string;

/** Bundle output, laid out like /var/task: <task>/app/functions/<rel>/handler.mjs. */
const taskDir = () => join(tmp, 'task');

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'smoz-bundle-'));
  const src = join(tmp, 'src');
  const files: Record<string, string> = {
    'app/config/base.ts': baseConfig,
    'app/config/app.config.ts': config(''),
    'app/config/kebab.config.ts': config(
      "functionDefaults: { functionName: 'kebab' }",
    ),
  };
  for (const f of Object.values(fixtures)) {
    files[`app/functions/${f.rel}/lambda.ts`] = lambdaSource(f);
    files[`app/functions/${f.rel}/handler.ts`] = handlerSource;
  }
  for (const [rel, text] of Object.entries(files)) {
    const abs = join(src, rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, text);
  }

  // As the Serverless esbuild build does: one ESM bundle per handler, with
  // app.config.ts (and SMOZ) inlined.
  await build({
    entryPoints: Object.values(fixtures).map((f) =>
      join(src, 'app/functions', f.rel, 'handler.ts'),
    ),
    outdir: taskDir(),
    outbase: src,
    outExtension: { '.js': '.mjs' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
    alias: { '@karmaniverous/smoz': join(repoRoot, 'src/index.ts') },
    tsconfig: join(repoRoot, 'tsconfig.json'),
    nodePaths: [join(repoRoot, 'node_modules')],
    logLevel: 'silent',
  });
  // The fixture sources are gone at runtime, as in a deployed Lambda.
  await rm(src, { recursive: true, force: true });
}, 120_000);

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

/** Cold-start the bundled handler of a fixture (importing it runs defineFunction). */
const coldStart = async ({ rel }: Fixture) => {
  const url = pathToFileURL(
    join(taskDir(), 'app/functions', rel, 'handler.mjs'),
  ).href;
  const mod = (await import(url)) as {
    handler: (event: unknown, context: unknown) => Promise<unknown>;
  };
  return mod.handler;
};

const get = async (fixture: Fixture, method: string) => {
  const handler = await coldStart(fixture);
  return (await handler(
    createApiGatewayV1Event(method, { Accept: 'application/json' }),
    createLambdaContext(),
  )) as HttpResponse;
};

describe('defineFunction in an esbuild bundle (#29)', () => {
  it.each([
    ['the minimal form', fixtures.minimal!, 'GET'],
    ['the kebab name style', fixtures.kebab!, 'GET'],
    [
      'an explicit eventType with a name style',
      fixtures.explicitEventType!,
      'POST',
    ],
  ])('serves %s', async (_, fixture, method) => {
    const res = await get(fixture, method);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('runs a minimal non-HTTP function', async () => {
    const handler = await coldStart(fixtures.nonHttp!);
    expect(await handler({ Records: [] }, createLambdaContext())).toEqual({
      ok: true,
    });
  });
});
