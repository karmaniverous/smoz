import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createApiGatewayV1Event, createLambdaContext } from '@/src/test/aws';

import type { Handler, HandlerOptions, ShapedEvent } from './Handler';

const eventSchema = z.object({
  id: z.string(),
  q: z.string().optional(),
});

const responseSchema = z.object({
  ok: z.boolean(),
  id: z.string(),
  requestId: z.string(),
});

describe('Handler type', () => {
  it('accepts (ShapedEvent<EventSchema>, Context, HandlerOptions) -> payload', async () => {
    const impl: Handler<
      typeof eventSchema,
      typeof responseSchema,
      APIGatewayProxyEvent
    > = async (
      event: ShapedEvent<typeof eventSchema, APIGatewayProxyEvent>,
      ctx: Context,
      opts: HandlerOptions,
    ) => {
      opts.logger.info('handling', event.id);
      return { ok: true, id: event.id, requestId: ctx.awsRequestId };
    };
    const info = vi.fn();

    const result = await impl(
      {
        ...createApiGatewayV1Event('GET'),
        ...eventSchema.parse({ id: 'x' }),
      } as ShapedEvent<typeof eventSchema, APIGatewayProxyEvent>,
      createLambdaContext(),
      {
        env: {},
        logger: { debug: vi.fn(), info, error: vi.fn(), log: vi.fn() },
      },
    );

    expect(responseSchema.parse(result)).toEqual({
      ok: true,
      id: 'x',
      requestId: 'test-req-id',
    });
    expect(info).toHaveBeenCalledWith('handling', 'x');
  });
});
