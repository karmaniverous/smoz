import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';

import { describe, expect, it } from 'vitest';

import { detectSecurityContext } from '@/src/runtime/detectSecurityContext';

import { toEvent } from './http';
import type { Route } from './routes';

/** Minimal IncomingMessage for toEvent — real class, no property collisions. */
const stubReq = (
  method: string,
  url: string,
  headers: Record<string, string> = {},
): IncomingMessage => {
  const req = new IncomingMessage(new Socket());
  req.method = method;
  req.url = url;
  for (const [k, v] of Object.entries(headers)) {
    req.headers[k.toLowerCase()] = v;
  }
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
