/* REQUIREMENTS ADDRESSED (TEST)
- The multipart parser's output shape matches docs-src/middleware.md.
*/
import { describe, expect, it } from 'vitest';

import type { HttpStackOptions } from '@/src/http/middleware/customization/types';
import {
  multipartBody,
  multipartContentType,
  type Part,
} from '@/src/test/multipart';
import { run } from '@/src/test/multipartRun';

// Pins the parser's own output shape, which docs-src/middleware.md documents.
// If middy changes it, these fail and the docs need updating.
describe('multipart body parser: documented output shape', () => {
  const parse = async (
    parts: Part[],
    options: HttpStackOptions['multipartBodyParser'] = {},
  ) => {
    const { res, seen } = await run({
      contentType: multipartContentType,
      body: multipartBody(parts),
      fn: { options: { multipartBodyParser: options } },
    });
    return { res, body: seen as Record<string, unknown> };
  };
  const file = (name: string, filename: string): Part => ({
    name,
    value: filename,
    filename,
    contentType: 'text/plain',
  });

  it('keeps the last value of a repeated text field without brackets', async () => {
    const { body } = await parse([
      { name: 'a', value: '1' },
      { name: 'a', value: '2' },
    ]);
    expect(body.a).toBe('2');
  });

  it('collects bracketed text fields into an array under the stripped key, even when sent once', async () => {
    const { body } = await parse([{ name: 'tags[]', value: 'x' }]);
    expect(body.tags).toEqual(['x']);
  });

  it('turns a repeated file field into an array, newest first, keeping the key as sent', async () => {
    const { body } = await parse([
      file('files[]', 'one.txt'),
      file('files[]', 'two.txt'),
    ]);
    const files = body['files[]'] as { filename: string }[];
    expect(files.map((f) => f.filename)).toEqual(['two.txt', 'one.txt']);
  });

  it('silently truncates text fields over fieldSize', async () => {
    const { res, body } = await parse([{ name: 'name', value: 'Aris' }], {
      busboy: { limits: { fieldSize: 2 } },
    });
    expect(res.statusCode).toBe(200);
    expect(body.name).toBe('Ar');
  });

  it('silently drops fields beyond the fields limit', async () => {
    const { res, body } = await parse(
      [
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ],
      { busboy: { limits: { fields: 1 } } },
    );
    expect(res.statusCode).toBe(200);
    expect(body.a).toBe('1');
    expect(body.b).toBeUndefined();
  });

  it('rejects field names over fieldNameSize with 422', async () => {
    const { res } = await parse([{ name: 'x'.repeat(101), value: 'v' }]);
    expect(res.statusCode).toBe(422);
  });
});
