/* REQUIREMENTS ADDRESSED (TEST)
- parseWithZod returns the parsed output and throws Invalid event/response (#39 D2, D5).
- overlayParsed overlays parsed top-level keys on the raw event; undeclared keys survive (#39 D4).
*/
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ConsoleLogger } from '@/src/types/Loggable';
import {
  overlayParsed,
  parseWithZod,
  shapeEvent,
} from '@/src/util/zodValidate';

const logger: ConsoleLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

describe('parseWithZod', () => {
  it('returns the value unchanged when there is no schema', () => {
    const v = { a: '1' };
    expect(parseWithZod(v, undefined, logger, 'event')).toBe(v);
  });

  it('returns the parsed output, not the input', () => {
    const schema = z.object({ n: z.coerce.number() });
    expect(parseWithZod({ n: '5', x: 1 }, schema, logger, 'event')).toEqual({
      n: 5,
    });
  });

  it.each([
    ['event', 'Invalid event'],
    ['response', 'Invalid response'],
  ] as const)('throws %s failures as "%s"', (kind, message) => {
    expect(() =>
      parseWithZod({ n: 'x' }, z.object({ n: z.number() }), logger, kind),
    ).toThrow(
      expect.objectContaining({
        name: 'ZodError',
        message,
        issues: [expect.objectContaining({ path: ['n'] })],
      }) as Error,
    );
  });
});

describe('parseWithZod logging', () => {
  it('never logs the validated payload', () => {
    const log: ConsoleLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };
    const secret = 'user@example.test';
    const schema = z.object({ email: z.email(), n: z.number() });
    parseWithZod({ email: secret, n: 1 }, schema, log, 'event');
    expect(() =>
      parseWithZod({ email: secret, n: 'x' }, schema, log, 'event'),
    ).toThrow('Invalid event');
    const logged = JSON.stringify(
      Object.values(log).flatMap((fn) => vi.mocked(fn).mock.calls),
    );
    expect(logged).not.toContain(secret);
    expect(log.error).toHaveBeenCalledWith('zod event validation failed', [
      expect.objectContaining({ path: ['n'] }),
    ]);
  });
});

describe('overlayParsed', () => {
  it('replaces declared keys and keeps undeclared ones', () => {
    expect(
      overlayParsed({ a: '1', headers: { Origin: 'o' } }, { a: 1 }),
    ).toEqual({ a: 1, headers: { Origin: 'o' } });
  });

  it('replaces a declared key wholly (no deep merge)', () => {
    expect(overlayParsed({ q: { a: '1', b: '2' } }, { q: { a: 1 } })).toEqual({
      q: { a: 1 },
    });
  });

  it('treats null-prototype objects as plain', () => {
    const parsed = Object.assign(Object.create(null) as object, { a: 1 });
    expect(overlayParsed({ a: 0, b: 2 }, parsed)).toEqual({ a: 1, b: 2 });
  });

  it.each([
    ['an array', [1, 2]],
    ['a primitive', 42],
    ['undefined', undefined],
    ['a class instance', new Date(0)],
  ])('returns the parsed output when it is %s', (_label, parsed) => {
    expect(overlayParsed({ a: 1 }, parsed)).toBe(parsed);
  });

  it('returns the parsed output when the raw event is not a plain object', () => {
    expect(overlayParsed('raw', { a: 1 })).toEqual({ a: 1 });
    expect(overlayParsed(null, { a: 1 })).toEqual({ a: 1 });
  });
});

describe('shapeEvent', () => {
  it('passes the event through untouched without a schema', () => {
    const e = { a: '1' };
    expect(shapeEvent(e, undefined, logger)).toBe(e);
  });

  it('overlays the parsed output on the raw event', () => {
    const schema = z.object({ a: z.coerce.number() });
    expect(shapeEvent({ a: '1', b: 'raw' }, schema, logger)).toEqual({
      a: 1,
      b: 'raw',
    });
  });

  it('throws Invalid event when the event fails its schema', () => {
    expect(() =>
      shapeEvent({ a: 'x' }, z.object({ a: z.number() }), logger),
    ).toThrow('Invalid event');
  });
});
