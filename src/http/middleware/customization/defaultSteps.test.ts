import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildSafeDefaults } from '@/src/http/middleware/httpStackCustomization';
import { assertInvariants, getId } from '@/src/http/middleware/transformUtils';

import { makeSerializer } from './defaultSteps';

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
