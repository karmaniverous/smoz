import { describe, expect, it } from 'vitest';

import { binaryMediaTypesOf, isBinaryMediaType } from './binaryMediaTypes';

describe('isBinaryMediaType', () => {
  it.each([
    ['multipart/form-data; boundary=x', ['multipart/form-data'], true],
    ['IMAGE/JPEG', ['image/*'], true],
    ['image/png', ['Image/PNG'], true],
    ['image/png', ['*/*'], true],
    ['application/json', ['*/*'], true],
    ['application/json', ['image/*', 'multipart/form-data'], false],
    ['application/octet-stream', ['application/json'], false],
    ['text/image', ['image/*'], false],
    ['image/png', ['image'], false],
    ['image/png', [], false],
    ['image', ['*/*'], false],
    ['', ['*/*'], false],
    [undefined, ['*/*'], false],
  ] as const)('%s against %j is %s', (contentType, types, expected) => {
    expect(isBinaryMediaType(contentType, types)).toBe(expected);
  });
});

describe('binaryMediaTypesOf', () => {
  it('reads provider.apiGateway.binaryMediaTypes, keeping only strings', () => {
    expect(
      binaryMediaTypesOf({
        provider: {
          apiGateway: {
            binaryMediaTypes: ['image/*', 42, 'multipart/form-data'],
          },
        },
      }),
    ).toEqual(['image/*', 'multipart/form-data']);
  });

  it.each([
    ['no config', undefined],
    ['no provider', {}],
    ['no apiGateway', { provider: {} }],
    ['no list', { provider: { apiGateway: {} } }],
    ['a non-array', { provider: { apiGateway: { binaryMediaTypes: '*/*' } } }],
  ])('is empty with %s', (_label, config) => {
    expect(binaryMediaTypesOf(config)).toEqual([]);
  });
});
