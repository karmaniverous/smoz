import type { APIGatewayProxyEvent, Context, SQSEvent } from 'aws-lambda';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';

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

/** #39 F3: `queryStringParameters` is an AWS index-signature map. */
const querySchema = z.object({
  queryStringParameters: z.object({ limit: z.coerce.number(), q: z.string() }),
});
type Q = typeof querySchema;

/** Assert on the shaped event of a real schema over base `B`. */
const shapedOver =
  <B>() =>
  <S extends z.ZodType>(schema: S) => {
    expect(schema).toBeInstanceOf(z.ZodType);
    return expectTypeOf<ShapedEvent<S, B>>();
  };

describe('ShapedEvent: parsed output replaces declared keys (#39)', () => {
  it('replaces an index-signature member with the schema output', () => {
    const shaped = shapedOver<APIGatewayProxyEvent>()(querySchema);
    shaped
      .toHaveProperty('queryStringParameters')
      .toEqualTypeOf<{ limit: number; q: string }>();
    // Undeclared keys keep their base types.
    shaped
      .toHaveProperty('headers')
      .toEqualTypeOf<APIGatewayProxyEvent['headers']>();
  });

  it('uses the output type, not the input type, of a transforming schema', () => {
    shapedOver<APIGatewayProxyEvent>()(
      z.object({ n: z.string().transform((v) => v.length) }),
    )
      .toHaveProperty('n')
      .toEqualTypeOf<number>();
  });

  it('shapes each member of a union base (no eventType) without collapsing to unknown', () => {
    type All = BaseEventTypeMap[keyof BaseEventTypeMap];
    type Shaped = ShapedEvent<Q, All>;
    expectTypeOf<Shaped['queryStringParameters']>().toEqualTypeOf<{
      limit: number;
      q: string;
    }>();
    // Member by member: each member keeps its own undeclared keys.
    expectTypeOf<
      Extract<Shaped, { Records: unknown }>['Records']
    >().not.toBeNever();
  });

  it('leaves the base event as is for a schema with unknown output', () => {
    shapedOver<SQSEvent>()(z.unknown()).toEqualTypeOf<SQSEvent>();
  });

  it('is the output itself when the output is not an object', () => {
    shapedOver<SQSEvent>()(z.array(z.string())).toEqualTypeOf<string[]>();
  });
});

describe('HandlerOptions env (#39 D3)', () => {
  it('carries the env type it is given', () => {
    type Env = { REGION: string; STAGE: string };
    expectTypeOf<HandlerOptions<Env>['env']>().toEqualTypeOf<Env>();
  });

  it('defaults to an untyped record', () => {
    expectTypeOf<HandlerOptions['env']>().toEqualTypeOf<
      Record<string, unknown>
    >();
  });
});
