import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineAppConfig } from '@/src';

// Minimal ad-hoc schemas to exercise compile-time and runtime constraints
const G = z.object({ A: z.string(), XOPT: z.string().optional() });
const S = z.object({ B: z.string() });

const serverless = {
  defaultHandlerFileName: 'handler',
  defaultHandlerFileExport: 'handler',
  httpContextEventMap: { my: {}, private: {}, public: {} },
};

// Each invalid config is rejected twice: the expect-error directive fails
// typecheck if defineAppConfig ever accepts it, and the runtime guard throws.
describe('compiletime.envKeys', () => {
  it('exposes the env keys of a valid config in the provider environment', () => {
    const ok = defineAppConfig(G, S, {
      serverless,
      global: { params: { A: 'a' }, envKeys: ['A'] as const },
      stage: { params: { dev: { B: 'b' } }, envKeys: ['B'] as const },
    });
    expect(ok.environment).toEqual({ A: '${param:A}', B: '${param:B}' });
  });

  it('rejects a global key missing from the global schema', () => {
    expect(() =>
      defineAppConfig(G, S, {
        serverless,
        // @ts-expect-error 'Z' is not a key of G
        global: { params: { A: 'a' }, envKeys: ['Z'] as const },
        stage: { params: { dev: { B: 'b' } }, envKeys: ['B'] as const },
      }),
    ).toThrow('global.envKeys contains unknown keys: Z');
  });

  it('rejects a stage key missing from the stage schema', () => {
    expect(() =>
      defineAppConfig(G, S, {
        serverless,
        global: { params: { A: 'a' }, envKeys: ['A'] as const },
        // @ts-expect-error 'A' belongs to G, not S
        stage: { params: { dev: { B: 'b' } }, envKeys: ['A'] as const },
      }),
    ).toThrow('stage.envKeys contains unknown keys: A');
  });
});
