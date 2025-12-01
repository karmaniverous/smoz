import { describe, expect, it } from 'vitest';

import {
  buildPathElements,
  sanitizeBasePath,
  splitPath,
} from '@/src/http/buildPath';

describe('buildPath helpers', () => {
  it('sanitizes base path and splits elements', () => {
    expect(sanitizeBasePath('\\users\\{id}\\')).toBe('users/{id}'); // slashes and curly
    expect(sanitizeBasePath('users/[id]')).toBe('users/{id}'); // brackets
    expect(splitPath('/a/b//c/')).toEqual(['a', 'b', 'c']);
  });

  it('builds elements with context prefix for non-public', () => {
    expect(buildPathElements('users', 'public')).toEqual(['users']);
    expect(buildPathElements('users', 'private')).toEqual(['private', 'users']);
    expect(buildPathElements('a/b', 'my')).toEqual(['my', 'a', 'b']);
  });
});
