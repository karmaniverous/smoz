import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { httpZodValidator } from '@/src/http/middleware/httpZodValidator';

const mkReq = (evt: Partial<APIGatewayProxyEvent>) =>
  ({ event: evt }) as unknown as { event: APIGatewayProxyEvent };

describe('httpZodValidator (unit)', () => {
  it('throws "Invalid event" when pre-handler schema fails', async () => {
    const mw = httpZodValidator({
      eventSchema: z.object({ a: z.string() }),
    });
    await expect(
      mw.before?.(mkReq({ httpMethod: 'GET' }) as never),
    ).rejects.toMatchObject({ name: 'ZodError', message: 'Invalid event' });
  });

  it('throws "Invalid response" when post-handler schema fails', async () => {
    const mw = httpZodValidator({
      responseSchema: z.object({ ok: z.boolean() }),
    });
    const req = {} as unknown as {
      response?: unknown;
      event?: APIGatewayProxyEvent;
      context?: Context;
    };
    // Not pre-shaped; not a string; should be validated and fail
    req.response = 123;
    await expect(mw.after?.(req as never)).rejects.toMatchObject({
      name: 'ZodError',
      message: 'Invalid response',
    });
  });

  it('bypasses validation for pre-shaped responses and raw strings', async () => {
    const mw = httpZodValidator({
      responseSchema: z.object({ ok: z.boolean() }),
    });
    // Pre-shaped response
    const shaped = {
      response: {
        statusCode: 200,
        headers: {},
        body: '{"notValidated":true}',
      },
    };
    await expect(mw.after?.(shaped as never)).resolves.toBeUndefined();
    // Raw string response
    const raw = { response: 'hello' };
    await expect(mw.after?.(raw as never)).resolves.toBeUndefined();
  });
});
