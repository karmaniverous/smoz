import middy from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import {
  type AppHttpConfig,
  buildSafeDefaults,
  computeHttpMiddleware,
  type FunctionHttpConfig,
} from '@/src/http/middleware/httpStackCustomization';
import { getId } from '@/src/http/middleware/transformUtils';
import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';
import {
  boundary,
  formParts,
  multipartBody,
  multipartContentType,
  type Part,
} from '@/src/test/multipart';

import type { HttpStackOptions } from './types';

type HttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

/**
 * Run a request through the computed stack; returns the response and the body
 * the handler saw.
 */
const run = async (args: {
  method?: string;
  contentType: string;
  body: string;
  isBase64Encoded?: boolean;
  app?: AppHttpConfig;
  fn?: FunctionHttpConfig;
}): Promise<{ res: HttpResponse; seen: unknown }> => {
  let seen: unknown;
  const http = computeHttpMiddleware({
    functionName: 'multipartFn',
    logger: { ...console, error: () => undefined },
    ...(args.app ? { app: args.app } : {}),
    ...(args.fn ? { fn: args.fn } : {}),
  });
  const wrapped = middy(async (e: APIGatewayProxyEvent) => {
    seen = e.body;
    return { ok: true };
  }).use(http);
  const evt = createApiGatewayV1Event(args.method ?? 'POST', {
    Accept: 'application/json',
    'Content-Type': args.contentType,
  });
  evt.body = args.body;
  evt.isBase64Encoded = args.isBase64Encoded ?? false;
  const res = (await wrapped(
    evt,
    createLambdaContext(),
  )) as unknown as HttpResponse;
  return { res, seen };
};

const beforeIds = (opts: HttpStackOptions) =>
  buildSafeDefaults({
    contentType: 'application/json',
    logger: console,
    opts,
  }).before.map(getId);

describe('multipart body parser: default phases', () => {
  it('is absent unless enabled', () => {
    expect(beforeIds({})).not.toContain('multipart-body-parser');
    expect(beforeIds({ multipartBodyParser: false })).not.toContain(
      'multipart-body-parser',
    );
  });

  it('sits between json-body-parser and zod-before when enabled', () => {
    const ids = beforeIds({ multipartBodyParser: {} });
    const at = ids.indexOf('multipart-body-parser');
    expect(at).toBe(ids.indexOf('json-body-parser') + 1);
    expect(ids[at + 1]).toBe('zod-before');
  });
});

describe('multipart body parser: request handling', () => {
  it('leaves a multipart body unparsed by default', async () => {
    const body = multipartBody(formParts);
    const { res, seen } = await run({
      contentType: multipartContentType,
      body,
    });
    expect(res.statusCode).toBe(200);
    expect(seen).toBe(body);
  });

  it('passes parsed fields and files through unchanged when enabled', async () => {
    const { res, seen } = await run({
      contentType: multipartContentType,
      body: multipartBody(formParts),
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(res.statusCode).toBe(200);
    const parsed = seen as Record<string, unknown>;
    expect(parsed.name).toBe('Aris');
    const logo = parsed.logo as Record<string, unknown>;
    expect(logo).toMatchObject({
      filename: 'logo.png',
      mimetype: 'image/png',
      truncated: false,
    });
    expect(Buffer.isBuffer(logo.content)).toBe(true);
    expect((logo.content as Buffer).toString()).toBe('PNGDATA');
  });

  it('decodes base64-encoded bodies from API Gateway', async () => {
    const { seen } = await run({
      contentType: multipartContentType,
      body: Buffer.from(multipartBody(formParts)).toString('base64'),
      isBase64Encoded: true,
      fn: { options: { multipartBodyParser: {} } },
    });
    expect((seen as Record<string, unknown>).name).toBe('Aris');
  });

  it('still parses JSON bodies when enabled', async () => {
    const { res, seen } = await run({
      contentType: 'application/json',
      body: JSON.stringify({ hello: 'world' }),
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(res.statusCode).toBe(200);
    expect(seen).toEqual({ hello: 'world' });
  });

  it('skips GET requests', async () => {
    const body = multipartBody(formParts);
    const { seen } = await run({
      method: 'GET',
      contentType: multipartContentType,
      body,
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(seen).toBe(body);
  });

  it('can be enabled by a profile and disabled per function', async () => {
    const app: AppHttpConfig = {
      profiles: { uploads: { multipartBodyParser: {} } },
    };
    const body = multipartBody(formParts);

    const enabled = await run({
      contentType: multipartContentType,
      body,
      app,
      fn: { profile: 'uploads' },
    });
    expect((enabled.seen as Record<string, unknown>).name).toBe('Aris');

    const disabled = await run({
      contentType: multipartContentType,
      body,
      app,
      fn: { profile: 'uploads', options: { multipartBodyParser: false } },
    });
    expect(disabled.seen).toBe(body);
  });

  it('can be enabled in app defaults', async () => {
    const { seen } = await run({
      contentType: multipartContentType,
      body: multipartBody(formParts),
      app: { defaults: { multipartBodyParser: {} } },
    });
    expect((seen as Record<string, unknown>).name).toBe('Aris');
  });

  it('passes other content types through untouched when enabled', async () => {
    const { res, seen } = await run({
      contentType: 'text/plain',
      body: 'hello',
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(res.statusCode).toBe(200);
    expect(seen).toBe('hello');
  });

  it('returns 415 for other content types when disableContentTypeError is false', async () => {
    const { res } = await run({
      contentType: 'text/plain',
      body: 'hello',
      fn: {
        options: { multipartBodyParser: { disableContentTypeError: false } },
      },
    });
    expect(res.statusCode).toBe(415);
  });

  it('skips empty bodies', async () => {
    const { res, seen } = await run({
      contentType: multipartContentType,
      body: '',
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(res.statusCode).toBe(200);
    expect(seen).toBe('');
  });

  it('leaves quoted boundaries unparsed (parser content-type pattern)', async () => {
    const body = multipartBody(formParts);
    const { seen } = await run({
      contentType: `multipart/form-data; boundary="${boundary}"`,
      body,
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(seen).toBe(body);
  });

  it('passes busboy limits through to the parser', async () => {
    const { res } = await run({
      contentType: multipartContentType,
      body: multipartBody(formParts),
      fn: {
        options: {
          multipartBodyParser: { busboy: { limits: { fileSize: 3 } } },
        },
      },
    });
    expect(res.statusCode).toBe(413);
  });
});

// Pins the parser's own output shape, which docs-src/middleware.md documents.
// If middy changes it, these fail and the docs need updating.
describe('multipart body parser: documented output shape', () => {
  const parse = async (
    parts: Part[],
    options: HttpStackOptions['multipartBodyParser'] = {},
  ) => {
    const { res, seen } = await run({
      contentType: multipartContentType,
      body: multipartBody(parts),
      fn: { options: { multipartBodyParser: options } },
    });
    return { res, body: seen as Record<string, unknown> };
  };
  const file = (name: string, filename: string): Part => ({
    name,
    value: filename,
    filename,
    contentType: 'text/plain',
  });

  it('keeps the last value of a repeated text field without brackets', async () => {
    const { body } = await parse([
      { name: 'a', value: '1' },
      { name: 'a', value: '2' },
    ]);
    expect(body.a).toBe('2');
  });

  it('collects bracketed text fields into an array under the stripped key, even when sent once', async () => {
    const { body } = await parse([{ name: 'tags[]', value: 'x' }]);
    expect(body.tags).toEqual(['x']);
  });

  it('turns a repeated file field into an array, newest first, keeping the key as sent', async () => {
    const { body } = await parse([
      file('files[]', 'one.txt'),
      file('files[]', 'two.txt'),
    ]);
    const files = body['files[]'] as { filename: string }[];
    expect(files.map((f) => f.filename)).toEqual(['two.txt', 'one.txt']);
  });

  it('silently truncates text fields over fieldSize', async () => {
    const { res, body } = await parse([{ name: 'name', value: 'Aris' }], {
      busboy: { limits: { fieldSize: 2 } },
    });
    expect(res.statusCode).toBe(200);
    expect(body.name).toBe('Ar');
  });

  it('silently drops fields beyond the fields limit', async () => {
    const { res, body } = await parse(
      [
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ],
      { busboy: { limits: { fields: 1 } } },
    );
    expect(res.statusCode).toBe(200);
    expect(body.a).toBe('1');
    expect(body.b).toBeUndefined();
  });

  it('rejects field names over fieldNameSize with 422', async () => {
    const { res } = await parse([{ name: 'x'.repeat(101), value: 'v' }]);
    expect(res.statusCode).toBe(422);
  });
});
