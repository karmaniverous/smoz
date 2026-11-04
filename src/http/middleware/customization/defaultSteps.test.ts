import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildSafeDefaults } from '@/src/http/middleware/httpStackCustomization';
import { assertInvariants, getId } from '@/src/http/middleware/transformUtils';

import { makeErrorExpose, makeSerializer } from './defaultSteps';

type Req = Parameters<
  NonNullable<ReturnType<typeof makeErrorExpose>['onError']>
>[0];

/** Run the error-expose step on an error; returns the (mutated) error. */
const expose = async <E>(error: E): Promise<E> => {
  await makeErrorExpose().onError?.({ error } as unknown as Req);
  return error;
};

const withStatus = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });

describe('error-expose step', () => {
  it('maps zod errors without a status to 400', async () => {
    const err = await expose(
      Object.assign(new Error('bad'), { name: 'ZodError' }),
    );
    expect(err).toMatchObject({ statusCode: 400, expose: true });
    expect(JSON.parse(err.message)).toEqual({
      statusCode: 400,
      message: 'bad',
    });
  });

  it('maps "Invalid event" / "Invalid response" messages to 400', async () => {
    for (const message of ['Invalid event', 'Invalid response']) {
      expect(await expose(new Error(message))).toMatchObject({
        statusCode: 400,
      });
    }
  });

  it('keeps an existing status code', async () => {
    const err = await expose(withStatus('Invalid event', 404));
    expect(err.statusCode).toBe(404);
    expect(JSON.parse(err.message)).toEqual({
      statusCode: 404,
      message: 'Invalid event',
    });
  });

  it('defaults other errors to 500', async () => {
    const err = (await expose(new Error(''))) as Error & { statusCode: number };
    expect(err.statusCode).toBe(500);
    expect(JSON.parse(err.message)).toEqual({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  });

  it('does not double-encode an already encoded message', async () => {
    const encoded = JSON.stringify({ statusCode: 418, message: 'teapot' });
    const err = await expose(withStatus(encoded, 418));
    expect(err.message).toBe(encoded);
  });

  it('ignores non-Error values', async () => {
    expect(await expose('nope')).toBe('nope');
  });
});

describe('serializer step', () => {
  const serialize = async (
    body: unknown,
    stringify?: (v: unknown) => string,
  ): Promise<unknown> => {
    const step = makeSerializer('application/json', {
      ...(stringify ? { serializer: { json: { stringify } } } : {}),
    });
    const request = {
      event: { headers: {}, requiredContentTypes: ['application/json'] },
      response: { statusCode: 200, headers: {}, body },
      context: {},
    };
    await step.after?.(request as never);
    return request.response.body;
  };

  it('passes string bodies through without re-encoding', async () => {
    expect(await serialize('{"a":1}')).toBe('{"a":1}');
  });

  it('stringifies objects, honouring a custom stringify', async () => {
    expect(await serialize({ a: 1 })).toBe('{"a":1}');
    expect(await serialize({ a: 1 }, () => 'custom')).toBe('custom');
  });
});

describe('buildSafeDefaults', () => {
  it('produces phases satisfying invariants', () => {
    const phases = buildSafeDefaults({
      contentType: 'application/json',
      logger: console,
      opts: {},
      eventSchema: undefined,
      responseSchema: undefined,
    });
    expect(() => {
      assertInvariants(phases);
    }).not.toThrow();
  });

  it('includes zod-before/after when schemas are present', () => {
    const phases = buildSafeDefaults({
      contentType: 'application/json',
      logger: console,
      opts: {},
      eventSchema: z.object({}),
      responseSchema: z.object({}),
    });
    const beforeIds = phases.before.map(getId);
    const afterIds = phases.after.map(getId);
    expect(beforeIds).toContain('zod-before');
    expect(afterIds).toContain('zod-after');
  });
});
