import { describe, expect, it } from 'vitest';

import {
  buildPathElements,
  inferContextFromPath,
  sanitizeBasePath,
  splitPath,
} from '@/src/http/buildPath';

describe('buildPath helpers', () => {
  it('sanitizes base path and splits elements', () => {
    expect(sanitizeBasePath('\\users\\{id}\\')).toBe('users/{id}');
    expect(splitPath('/a/b//c/')).toEqual(['a', 'b', 'c']);
  });

  it('builds elements with context prefix for non-public', () => {
    expect(buildPathElements('users', 'public')).toEqual(['users']);
    expect(buildPathElements('users', 'private')).toEqual(['private', 'users']);
    expect(buildPathElements('a/b', 'my')).toEqual(['my', 'a', 'b']);
  });

  it('infers context from path (inverse of buildPathElements)', () => {
    expect(inferContextFromPath('/users')).toBe('public');
    expect(inferContextFromPath('/private/users')).toBe('private');
    expect(inferContextFromPath('/my/users/{id}')).toBe('my');
    expect(inferContextFromPath('/public/something')).toBe('public');
    expect(inferContextFromPath('/')).toBe('public');
  });

  it('roundtrips: inferContextFromPath(buildPathElements(path, ctx)) === ctx', () => {
    const cases: Array<{ basePath: string; ctx: 'my' | 'private' | 'public' }> =
      [
        { basePath: 'users', ctx: 'public' },
        { basePath: 'users', ctx: 'private' },
        { basePath: 'users/{id}', ctx: 'my' },
        { basePath: 'a/b/c', ctx: 'private' },
      ];
    for (const { basePath, ctx } of cases) {
      const built = '/' + buildPathElements(basePath, ctx).join('/');
      expect(inferContextFromPath(built)).toBe(ctx);
    }
  });
});
