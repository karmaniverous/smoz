import type { APIGatewayProxyEvent, Context, SQSEvent } from 'aws-lambda';
import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import type { Handler, HandlerOptions, ShapedEvent } from './Handler';

/** Event schema type: `z.object({ id: z.string(), q: z.string().optional() })`. */
type E = z.ZodObject<{ id: z.ZodString; q: z.ZodOptional<z.ZodString> }>;
/** Response schema type: `z.object({ ok: z.boolean() })`. */
type R = z.ZodObject<{ ok: z.ZodBoolean }>;

describe('Handler type', () => {
  it('takes (ShapedEvent<EventSchema>, Context, HandlerOptions)', () => {
    expectTypeOf<
      Handler<E, R, APIGatewayProxyEvent>
    >().parameters.toEqualTypeOf<
      [ShapedEvent<E, APIGatewayProxyEvent>, Context, HandlerOptions]
    >();
  });

  it('returns a promise of the response schema payload', () => {
    expectTypeOf<
      ReturnType<Handler<E, R, APIGatewayProxyEvent>>
    >().toEqualTypeOf<Promise<z.infer<R>>>();
  });

  it('returns a promise of unknown without a response schema', () => {
    expectTypeOf<
      ReturnType<Handler<E, undefined, APIGatewayProxyEvent>>
    >().toEqualTypeOf<Promise<unknown>>();
  });
});

describe('ShapedEvent type', () => {
  it('overlays the event schema on the base event', () => {
    type Shaped = ShapedEvent<E, APIGatewayProxyEvent>;
    expectTypeOf<Shaped['id']>().toEqualTypeOf<string>();
    expectTypeOf<Shaped['httpMethod']>().toEqualTypeOf<string>();
  });

  it('is the base event without an event schema', () => {
    expectTypeOf<ShapedEvent<undefined, SQSEvent>>().toEqualTypeOf<SQSEvent>();
  });
});
