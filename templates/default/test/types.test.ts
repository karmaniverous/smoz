/**
 * Type checks on the template's endpoints: handlers keep defineFunction's
 * inference (typed event, response checked against responseSchema). A cast or
 * a widening to unknown, any or never fails the typecheck.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expectTypeOf, it } from 'vitest';

// Type-only: nothing is loaded at runtime, so the check needs no deployment env.
import type { fn as hello } from '@/app/functions/rest/hello/get/lambda';
import type { fn as openapi } from '@/app/functions/rest/openapi/get/lambda';

type BusinessOf<F extends { handler: (business: never) => unknown }> =
  Parameters<F['handler']>[0];
type EventOf<F extends { handler: (business: never) => unknown }> = Parameters<
  BusinessOf<F>
>[0];
type ResultOf<F extends { handler: (business: never) => unknown }> = Awaited<
  ReturnType<BusinessOf<F>>
>;

describe('template endpoint types', () => {
  it('types each handler event as the REST event', () => {
    // Mutual assignability: neither any, unknown nor never passes both.
    expectTypeOf<EventOf<typeof hello>>().toExtend<APIGatewayProxyEvent>();
    expectTypeOf<APIGatewayProxyEvent>().toExtend<EventOf<typeof hello>>();
    expectTypeOf<EventOf<typeof hello>>().not.toBeAny();
    expectTypeOf<EventOf<typeof openapi>>().toExtend<APIGatewayProxyEvent>();
    expectTypeOf<APIGatewayProxyEvent>().toExtend<EventOf<typeof openapi>>();
    expectTypeOf<EventOf<typeof openapi>>().not.toBeAny();
  });

  it('checks the hello handler response against responseSchema', () => {
    expectTypeOf<ResultOf<typeof hello>>().toEqualTypeOf<{ ok: boolean }>();
  });
});
