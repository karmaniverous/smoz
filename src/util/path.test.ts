import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { dirFromHere, segmentsUnder, toPosixPath } from '@/src/util/path';

describe('util/path.dirFromHere', () => {
  const url = pathToFileURL(path.resolve('/', 'a', 'b', 'c', 'mod.ts')).href;
  const posixDir = (...parts: string[]) =>
    `${toPosixPath(path.resolve('/', ...parts))}/`;

  it("ascends one level from the module's folder by default", () => {
    expect(dirFromHere(url)).toBe(posixDir('a', 'b'));
  });

  it('ascends N levels', () => {
    expect(dirFromHere(url, 2)).toBe(posixDir('a'));
  });
});

describe('util/path.segmentsUnder', () => {
  const root = path.resolve('/', 'app', 'functions');

  it('returns the folders from root to a directory inside it', () => {
    expect(segmentsUnder(root, path.join(root, 'rest', 'users'))).toEqual([
      'rest',
      'users',
    ]);
    expect(segmentsUnder(root, root)).toEqual([]);
  });

  it("treats a folder whose name starts with '..' as inside", () => {
    expect(segmentsUnder(root, path.join(root, '..foo', 'get'))).toEqual([
      '..foo',
      'get',
    ]);
  });

  it('returns undefined above root', () => {
    expect(segmentsUnder(root, path.dirname(root))).toBeUndefined();
    expect(segmentsUnder(root, path.join(root, '..', 'lib'))).toBeUndefined();
  });

  // Only Windows has drive letters: path.relative across drives returns an
  // absolute path instead of a '..' path.
  it.runIf(process.platform === 'win32')(
    'returns undefined on another drive',
    () => {
      expect(segmentsUnder('C:\\app', 'D:\\app\\rest')).toBeUndefined();
    },
  );
});
