import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineAppConfig } from '@/src';

// Minimal ad-hoc schemas to exercise compile-time constraints
const G = z.object({ A: z.string(), XOPT: z.string().optional() });
const S = z.object({ B: z.string() });

const ok = defineAppConfig(G, S, {
  serverless: {
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
    httpContextEventMap: { my: {}, private: {}, public: {} },
  },
  global: { params: { A: 'a' }, envKeys: ['A'] as const },
  stage: { params: { dev: { B: 'b' } }, envKeys: ['B'] as const },
});

type GKeys = readonly (keyof z.infer<typeof G>)[];
// Expect compile-time failure: 'Z' not in G.shape; error on this line.
// @ts-expect-error 'Z' is not a key of G
['Z'] as const satisfies GKeys;

type SKeys = readonly (keyof z.infer<typeof S>)[];
// Expect compile-time failure: 'A' belongs to G, not S; error on this line.
// @ts-expect-error 'A' is not a key of S
['A'] as const satisfies SKeys;

// The two invalid cases above only enforce compile-time constraints via the
// expect-error directive; the valid config is checked at runtime below.
describe('compiletime.envKeys', () => {
  it('keeps the env keys of a valid config', () => {
    expect(ok.global.envKeys).toEqual(['A']);
    expect(ok.stage.envKeys).toEqual(['B']);
  });
});
export {};
