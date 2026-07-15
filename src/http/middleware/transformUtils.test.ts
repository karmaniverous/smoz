import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import {
  findIndex,
  getId,
  insertAfter,
  insertBefore,
  removeStep,
  replaceStep,
  tagStep,
} from '@/src/http/middleware/transformUtils';

type M = MiddlewareObj<APIGatewayProxyEvent, Context>;

const mk = (id: Parameters<typeof tagStep>[1]): M => tagStep({}, id);

describe('transformUtils helpers', () => {
  it('getId, findIndex work on tagged steps', () => {
    const list = [mk('head'), mk('shape'), mk('serializer')];
    expect(getId(list[0]!)).toBe('head');
    expect(findIndex(list, 'shape')).toBe(1);
    expect(findIndex(list, 'serializer')).toBe(2);
    expect(findIndex(list, 'zod-before')).toBe(-1);
  });

  it('insertBefore/After produce correct order', () => {
    const list = [mk('head'), mk('shape'), mk('serializer')];
    const x = mk('zod-after');
    const before = insertBefore(list, 'serializer', x);
    expect(before.map(getId)).toEqual([
      'head',
      'shape',
      'zod-after',
      'serializer',
    ]);
    const after = insertAfter(list, 'shape', x);
    expect(after.map(getId)).toEqual([
      'head',
      'shape',
      'zod-after',
      'serializer',
    ]);
  });

  it('replaceStep and removeStep operate by id', () => {
    const list = [mk('head'), mk('shape'), mk('serializer')];
    const repl = mk('shape'); // id is the same; object instance differs
    const replaced = replaceStep(list, 'shape', repl);
    expect(replaced.map(getId)).toEqual(['head', 'shape', 'serializer']);
    // remove 'shape'
    const removed = removeStep(replaced, 'shape');
    expect(removed.map(getId)).toEqual(['head', 'serializer']);
  });
});
