/**
 * Type checks on the template's endpoints: handlers keep defineFunction's
 * inference (typed event, response checked against responseSchema). A cast or
 * a widening to unknown/any fails the typecheck.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expectTypeOf, it } from 'vitest';

// Type-only: nothing is loaded at runtime, so the check needs no deployment env.
import type { fn as hello } from '@/app/functions/rest/hello/get/lambda';

type BusinessOf<F extends { handler: (business: never) => unknown }> =
  Parameters<F['handler']>[0];

describe('template endpoint types', () => {
  it('types the hello handler event as the REST event', () => {
    expectTypeOf<
      Parameters<BusinessOf<typeof hello>>[0]
    >().toExtend<APIGatewayProxyEvent>();
    expectTypeOf<Parameters<BusinessOf<typeof hello>>[0]>().not.toBeAny();
  });

  it('checks the hello handler response against responseSchema', () => {
    expectTypeOf<
      Awaited<ReturnType<BusinessOf<typeof hello>>>
    >().toEqualTypeOf<{
      ok: boolean;
    }>();
  });
});
