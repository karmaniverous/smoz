/* REQUIREMENTS ADDRESSED (TEST)
- Validate middleware stack behavior: content-type header, HEAD short-circuit, and Zod error mapping (HTTP-only; no internal mode).
- Tests should not rely on unsafe stringification; prefer explicit type checks.
*/
import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';
import type { HttpResponse } from '@/src/test/http';

import { computeHttpMiddleware } from './customization/compute';

const run = async (
  base: (e: APIGatewayProxyEvent, c: Context) => Promise<unknown>,
  opts: {
    eventSchema?: z.ZodType;
    responseSchema?: z.ZodType;
  },
  event: APIGatewayProxyEvent,
  ctx: Context,
): Promise<HttpResponse> => {
  const stack = computeHttpMiddleware({
    functionName: 'test',
    eventSchema: opts.eventSchema,
    responseSchema: opts.responseSchema,
  });
  const wrapped = middy(async (e: APIGatewayProxyEvent, c: Context) =>
    base(e, c),
  ).use(stack);
  return (await wrapped(event, ctx)) as HttpResponse;
};
describe('stack: response shaping & content-type header', () => {
  it('sets Content-Type and preserves payload as JSON', async () => {
    const event = createApiGatewayV1Event('GET', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    const result = await run(
      async () => ({ hello: 'world' }) as const,
      {
        eventSchema: z.object({}),
      },
      event,
      ctx,
    );

    expect(result.statusCode).toBe(200);
    const contentType =
      result.headers['Content-Type'] ?? result.headers['content-type'] ?? '';
    expect(contentType.toLowerCase()).toMatch(/application\/json/);
    const body: unknown =
      typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
    expect(body).toEqual({ hello: 'world' });
  });
});
describe('stack: HEAD short-circuit', () => {
  it('responds 200 {} with Content-Type', async () => {
    const eventSchema = z.object({});
    const responseSchema = z.object({ what: z.string() });

    const event = createApiGatewayV1Event('HEAD', {
      Accept: 'application/json',
    });
    const ctx = createLambdaContext();

    const result = await run(
      async () => ({ ignored: true }) as const,
      {
        eventSchema,
        responseSchema,
      },
      event,
      ctx,
    );

    expect(result.statusCode).toBe(200);
    const contentType =
      result.headers['Content-Type'] ?? result.headers['content-type'] ?? '';
    expect(contentType.toLowerCase()).toMatch(/application\/json/);
    const body: unknown =
      typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
    expect(body).toEqual({});
  });
});
describe('stack: pre-shaped response', () => {
  it('preserves statusCode/body/headers and sets Content-Type', async () => {
    const event = createApiGatewayV1Event('POST', {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    const ctx = createLambdaContext();

    const result = await run(
      async () => ({
        statusCode: 201,
        headers: { 'X-Thing': 'y' },
        body: 'raw',
      }),
      {
        eventSchema: z.object({}),
      },
      event,
      ctx,
    );

    expect(result.statusCode).toBe(201);
    expect(result.headers['X-Thing'] ?? result.headers['x-thing']).toBe('y');
    expect(
      (result.headers['Content-Type'] ?? result.headers['content-type'] ?? '')
        .toLowerCase()
        .includes('application/json'),
    ).toBe(true);
    expect(result.body).toBe('raw');
  });
});
