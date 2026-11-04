import http from 'node:http';
import type { AddressInfo } from 'node:net';

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { afterEach, describe, expect, it } from 'vitest';

import { createListener } from './listener';
import { type Route, splitPattern } from './routes';

/** A route whose handler echoes how it received the body. */
const echo = (method: string, pattern: string): Route => ({
  method,
  pattern,
  segs: splitPattern(pattern),
  handlerRef: 'echo.handler',
  context: 'public',
  handler: async (e: APIGatewayProxyEvent) => ({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body: e.body,
      isBase64Encoded: e.isBase64Encoded,
      pathParameters: e.pathParameters,
    }),
  }),
});

const failing: Route = {
  ...echo('DELETE', '/fail'),
  handler: () => Promise.reject(new Error('kaboom')),
};

let server: http.Server | undefined;

/** Serve the listener on a free port; returns its base URL. */
const serve = async (binaryMediaTypes: readonly string[]): Promise<string> => {
  const s = http.createServer(
    createListener(
      [echo('POST', '/users/{id}/logo'), echo('GET', '/hello'), failing],
      binaryMediaTypes,
    ),
  );
  server = s;
  await new Promise<void>((resolve) => s.listen(0, resolve));
  return `http://localhost:${String((s.address() as AddressInfo).port)}`;
};

afterEach(async () => {
  const s = server;
  server = undefined;
  if (s) await new Promise((resolve) => s.close(resolve));
});

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x80, 0xff, 0xd9]);

describe('inline request listener', () => {
  it('delivers a binary-typed upload base64-encoded, bytes intact', async () => {
    const base = await serve(['image/*']);
    const res = await fetch(`${base}/users/42/logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg,
    });
    expect(res.status).toBe(200);
    const seen = (await res.json()) as {
      body: string;
      isBase64Encoded: boolean;
      pathParameters: Record<string, string>;
    };
    expect(seen.isBase64Encoded).toBe(true);
    expect(Buffer.from(seen.body, 'base64')).toEqual(jpeg);
    expect(seen.pathParameters).toEqual({ id: '42' });
  });

  it('delivers other bodies as text', async () => {
    const base = await serve([]);
    const res = await fetch(`${base}/users/42/logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg,
    });
    const seen = (await res.json()) as { isBase64Encoded: boolean };
    expect(seen.isBase64Encoded).toBe(false);
  });

  it('matches HEAD to a GET route', async () => {
    const base = await serve([]);
    const res = await fetch(`${base}/hello`, { method: 'HEAD' });
    expect(res.status).toBe(200);
  });

  it('answers an unknown route with 404', async () => {
    const base = await serve([]);
    const res = await fetch(`${base}/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not Found' });
  });

  it('answers a failing handler with 500 and its message', async () => {
    const base = await serve([]);
    const res = await fetch(`${base}/fail`, { method: 'DELETE' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'kaboom' });
  });
});
