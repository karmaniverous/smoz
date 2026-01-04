import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
    },
  };
});

describe('dev.inline: resolveInlineEntry', async () => {
  const { resolveInlineEntry } = (await import('@/src/cli/dev/inline')) as {
    resolveInlineEntry: (pkgRoot: string) => {
      entry: string;
      kind: 'compiled' | 'ts';
    };
  };
  const fsMod = (await import('node:fs')) as unknown as {
    default: { existsSync: ReturnType<typeof vi.fn> };
  };
  const toPosix = (p: string) => p.replace(/\\/g, '/');

  it('prefers compiled dist entry when present', () => {
    const pkgRoot = path.resolve('/', 'tmp', 'pkg');
    const compiled = path.resolve(pkgRoot, 'dist', 'cli', 'inline-server.js');
    fsMod.default.existsSync.mockImplementation((p: unknown) => {
      return String(p) === compiled;
    });
    const r = resolveInlineEntry(pkgRoot);
    expect(r.kind).toBe('compiled');
    expect(toPosix(r.entry)).toBe(toPosix(compiled));
  });

  it('falls back to TS entry when compiled is absent', () => {
    const pkgRoot = path.resolve('/', 'tmp', 'pkg');
    fsMod.default.existsSync.mockReturnValue(false);
    const tsPath = path.resolve(
      pkgRoot,
      'src',
      'cli',
      'local',
      'inline.server',
      'index.ts',
    );
    const r = resolveInlineEntry(pkgRoot);
    expect(r.kind).toBe('ts');
    expect(toPosix(r.entry)).toBe(toPosix(tsPath));
  });
});
