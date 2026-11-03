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

import type { HttpStackOptions } from './types';

type HttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type Part =
  | { name: string; value: string }
  | { name: string; value: string; filename: string; contentType: string };

const boundary = 'smoz-test-boundary';
const multipartContentType = `multipart/form-data; boundary=${boundary}`;

/** Build a multipart/form-data body from text and file parts. */
const multipartBody = (parts: Part[]): string =>
  parts
    .map((p) => {
      const disposition =
        'filename' in p
          ? `form-data; name="${p.name}"; filename="${p.filename}"\r\nContent-Type: ${p.contentType}`
          : `form-data; name="${p.name}"`;
      return `--${boundary}\r\nContent-Disposition: ${disposition}\r\n\r\n${p.value}\r\n`;
    })
    .join('') + `--${boundary}--\r\n`;

const formParts: Part[] = [
  { name: 'name', value: 'Aris' },
  {
    name: 'logo',
    value: 'PNGDATA',
    filename: 'logo.png',
    contentType: 'image/png',
  },
];

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
