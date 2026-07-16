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
});

void eventSchema;
void responseSchema;

describe('Handler type', () => {
  it('accepts (ShapedEvent<EventSchema>, Context, HandlerOptions) -> payload', async () => {
    const impl: Handler<
      typeof eventSchema,
      typeof responseSchema,
      APIGatewayProxyEvent
    > = async (
      _event: ShapedEvent<typeof eventSchema, APIGatewayProxyEvent>,
      _ctx: Context,
      _opts: HandlerOptions,
    ) => {
      void _event;
      void _ctx;
      void _opts;
      return { ok: true };
    };

    expect(
      await impl(
        {
          ...createApiGatewayV1Event('GET'),
          id: 'x',
        } as unknown as ShapedEvent<typeof eventSchema, APIGatewayProxyEvent>,
        createLambdaContext(),
        {
          env: {},
          logger: {
            debug: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
            log: vi.fn(),
          },
        },
      ),
    ).toEqual({ ok: true });
  });
});
