import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';

import middy from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { computeHttpMiddleware } from '@/src/http/middleware/httpStackCustomization';
import { detectSecurityContext } from '@/src/runtime/detectSecurityContext';
import { createLambdaContext } from '@/src/test/aws';
import { multipartBytes, multipartContentType } from '@/src/test/multipart';

import { toEvent } from './http';
import type { Route } from './routes';

/** Minimal IncomingMessage for toEvent — real class, no property collisions. */
const stubReq = (
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: Buffer,
): IncomingMessage => {
  const req = new IncomingMessage(new Socket());
  req.method = method;
  req.url = url;
  for (const [k, v] of Object.entries(headers)) {
    req.headers[k.toLowerCase()] = v;
  }
  if (body) req.push(body);
  // End the stream so readBody resolves immediately.
  req.push(null);
  return req;
};

/** Build a minimal Route stub with the given context and pattern. */
const stubRoute = (
  context: 'my' | 'private' | 'public',
  pattern = `/${context === 'public' ? 'test' : context + '/test'}`,
): Route => ({
  method: 'GET',
  pattern,
  segs: [],
  handlerRef: 'test.handler',
  context,
  handler: async () => ({ statusCode: 200, body: '' }),
});

/**
 * Encode a JWT-shaped token (header.payload.signature) for testing.
 * No real crypto — just base64url-encodes the payload object.
 */
const fakeJwt = (claims: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  );
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.fakesig`;
};

describe('toEvent auth simulation', () => {
  it('populates authorizer.claims from JWT on a my-context route', async () => {
    const claims = { sub: 'user-123', email: 'a@b.com' };
    const req = stubReq('GET', '/my/test', {
      authorization: `Bearer ${fakeJwt(claims)}`,
    });
    const evt = await toEvent(req, stubRoute('my'), {});

    const authorizer = (
      evt.requestContext as unknown as {
        authorizer: { claims?: Record<string, unknown> };
      }
    ).authorizer;
    expect(authorizer.claims).toEqual(claims);
    expect(detectSecurityContext(evt)).toBe('my');
  });

  it('leaves authorizer undefined when my-context route has no JWT', async () => {
    const req = stubReq('GET', '/my/test');
    const evt = await toEvent(req, stubRoute('my'), {});

    const { authorizer } = evt.requestContext as unknown as {
      authorizer: unknown;
    };
    expect(authorizer).toBeUndefined();
    expect(detectSecurityContext(evt)).toBe('public');
  });

  it('leaves authorizer undefined when my-context route has malformed JWT', async () => {
    const req = stubReq('GET', '/my/test', {
      authorization: 'Bearer not-a-jwt',
    });
    const evt = await toEvent(req, stubRoute('my'), {});

    const { authorizer } = evt.requestContext as unknown as {
      authorizer: unknown;
    };
    expect(authorizer).toBeUndefined();
  });

  it('detects private context via x-api-key header', async () => {
    const req = stubReq('GET', '/private/test', {
      'x-api-key': 'some-key',
    });
    const evt = await toEvent(req, stubRoute('private'), {});

    const { authorizer } = evt.requestContext as unknown as {
      authorizer: unknown;
    };
    expect(authorizer).toBeUndefined();
    expect(detectSecurityContext(evt)).toBe('private');
  });

  it('returns public context for private route without API key', async () => {
    const req = stubReq('GET', '/private/test');
    const evt = await toEvent(req, stubRoute('private'), {});

    expect(detectSecurityContext(evt)).toBe('public');
  });

  it('returns public context for public route', async () => {
    const req = stubReq('GET', '/test');
    const evt = await toEvent(req, stubRoute('public', '/test'), {});

    expect(detectSecurityContext(evt)).toBe('public');
  });
});

/** JPEG start/end markers and JFIF header: not valid UTF-8. */
const jpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x80,
  0xc3, 0xfe, 0xff, 0xd9,
]);

const uploadParts = [
  { name: 'name', value: 'Aris' },
  {
    name: 'logo',
    value: jpeg,
    filename: 'logo.jpg',
    contentType: 'image/jpeg',
  },
];

/** POST `body` through toEvent with the given binary media types. */
const post = (
  contentType: string,
  body: Buffer,
  binaryMediaTypes?: readonly string[],
): Promise<APIGatewayProxyEvent> =>
  toEvent(
    stubReq(
      'POST',
      '/upload',
      { accept: 'application/json', 'content-type': contentType },
      body,
    ),
    stubRoute('public', '/upload'),
    {},
    binaryMediaTypes,
  );

/** Run an event through the HTTP stack with multipart parsing enabled. */
const parseMultipart = async (
  evt: APIGatewayProxyEvent,
): Promise<Record<string, unknown>> => {
  let seen: unknown;
  const wrapped = middy(async (e: APIGatewayProxyEvent) => {
    seen = e.body;
    return { ok: true };
  }).use(
    computeHttpMiddleware({
      functionName: 'upload',
      logger: { ...console, error: () => undefined },
      fn: { options: { multipartBodyParser: {} } },
    }),
  );
  await wrapped(evt, createLambdaContext());
  return seen as Record<string, unknown>;
};

describe('toEvent body encoding', () => {
  it('base64-encodes a multipart upload so the file bytes survive the HTTP stack', async () => {
    const evt = await post(multipartContentType, multipartBytes(uploadParts), [
      'multipart/form-data',
    ]);
    expect(evt.isBase64Encoded).toBe(true);
    expect(Buffer.from(evt.body ?? '', 'base64')).toEqual(
      multipartBytes(uploadParts),
    );

    const parsed = await parseMultipart(evt);
    expect(parsed.name).toBe('Aris');
    const logo = parsed.logo as { content: Buffer; mimetype: string };
    expect(logo.mimetype).toBe('image/jpeg');
    expect(logo.content.equals(jpeg)).toBe(true);
  });

  it('passes multipart as UTF-8 text when it is not a binary media type, as API Gateway does', async () => {
    const evt = await post(multipartContentType, multipartBytes(uploadParts));
    expect(evt.isBase64Encoded).toBe(false);

    const logo = (await parseMultipart(evt)).logo as { content: Buffer };
    // Invalid UTF-8 bytes become U+FFFD (ef bf bd): the corruption deployed
    // apps see without multipart/form-data in binaryMediaTypes.
    expect(logo.content.equals(jpeg)).toBe(false);
    expect(logo.content.subarray(0, 3)).toEqual(
      Buffer.from([0xef, 0xbf, 0xbd]),
    );
  });

  it('base64-encodes a raw image body matched by a wildcard type', async () => {
    const evt = await post('image/jpeg', jpeg, ['image/*']);
    expect(evt.isBase64Encoded).toBe(true);
    expect(Buffer.from(evt.body ?? '', 'base64')).toEqual(jpeg);
  });

  it('leaves a JSON body as UTF-8 text', async () => {
    const json = JSON.stringify({ name: 'Café ✓' });
    const evt = await post('application/json', Buffer.from(json), [
      'multipart/form-data',
      'image/*',
    ]);
    expect(evt.isBase64Encoded).toBe(false);
    expect(evt.body).toBe(json);
  });

  it('flags no empty body as base64, as API Gateway sends it unencoded', async () => {
    const evt = await post('image/jpeg', Buffer.alloc(0), ['image/*']);
    expect(evt.isBase64Encoded).toBe(false);
    expect(evt.body).toBe('');

    const get = await toEvent(
      stubReq('GET', '/upload', { 'content-type': 'image/jpeg' }, jpeg),
      stubRoute('public', '/upload'),
      {},
      ['image/*'],
    );
    expect(get.isBase64Encoded).toBe(false);
    expect(get.body).toBe('');
  });

  it('sends an empty, unflagged body when the request stream fails', async () => {
    const req = new IncomingMessage(new Socket());
    req.method = 'POST';
    req.url = '/upload';
    req.headers['content-type'] = 'image/jpeg';
    req.push(jpeg);
    setImmediate(() => req.emit('error', new Error('reset')));
    const evt = await toEvent(req, stubRoute('public', '/upload'), {}, [
      'image/*',
    ]);
    expect(evt.isBase64Encoded).toBe(false);
    expect(evt.body).toBe('');
  });
});

describe('toEvent query mapping', () => {
  it('keeps the first value of a repeated parameter and all values in the multi-value map', async () => {
    const evt = await toEvent(
      stubReq('GET', '/test?a=1&a=2&b=3'),
      stubRoute('public', '/test'),
      {},
    );
    expect(evt.queryStringParameters).toEqual({ a: '1', b: '3' });
    expect(evt.multiValueQueryStringParameters).toEqual({
      a: ['1', '2'],
      b: ['3'],
    });
  });
});
