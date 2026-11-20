/* REQUIREMENTS ADDRESSED (TEST)
- The opt-in multipart body parser sits in the default phases and handles
  requests as documented.
*/
import { describe, expect, it } from 'vitest';

import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import {
  boundary,
  formParts,
  multipartBody,
  multipartContentType,
} from '@/src/test/multipart';
import { beforeIds, run } from '@/src/test/multipartRun';

describe('multipart body parser: default phases', () => {
  it('is absent unless enabled', () => {
    expect(beforeIds({})).not.toContain('multipart-body-parser');
    expect(beforeIds({ multipartBodyParser: false })).not.toContain(
      'multipart-body-parser',
    );
  });

  it('sits between json-body-parser and zod-before when enabled', () => {
    const ids = beforeIds({ multipartBodyParser: {} });
    const at = ids.indexOf('multipart-body-parser');
    expect(at).toBe(ids.indexOf('json-body-parser') + 1);
    expect(ids[at + 1]).toBe('zod-before');
  });
});

describe('multipart body parser: request handling', () => {
  it('leaves a multipart body unparsed by default', async () => {
    const body = multipartBody(formParts);
    const { res, seen } = await run({
      contentType: multipartContentType,
      body,
    });
    expect(res.statusCode).toBe(200);
    expect(seen).toBe(body);
  });

  it('passes parsed fields and files through unchanged when enabled', async () => {
    const { res, seen } = await run({
      contentType: multipartContentType,
      body: multipartBody(formParts),
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(res.statusCode).toBe(200);
    const parsed = seen as Record<string, unknown>;
    expect(parsed.name).toBe('Aris');
    const logo = parsed.logo as Record<string, unknown>;
    expect(logo).toMatchObject({
      filename: 'logo.png',
      mimetype: 'image/png',
      truncated: false,
    });
    expect(Buffer.isBuffer(logo.content)).toBe(true);
    expect((logo.content as Buffer).toString()).toBe('PNGDATA');
  });

  it('decodes base64-encoded bodies from API Gateway', async () => {
    const { seen } = await run({
      contentType: multipartContentType,
      body: Buffer.from(multipartBody(formParts)).toString('base64'),
      isBase64Encoded: true,
      fn: { options: { multipartBodyParser: {} } },
    });
    expect((seen as Record<string, unknown>).name).toBe('Aris');
  });

  it('still parses JSON bodies when enabled', async () => {
    const { res, seen } = await run({
      contentType: 'application/json',
      body: JSON.stringify({ hello: 'world' }),
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(res.statusCode).toBe(200);
    expect(seen).toEqual({ hello: 'world' });
  });

  it('skips GET requests', async () => {
    const body = multipartBody(formParts);
    const { seen } = await run({
      method: 'GET',
      contentType: multipartContentType,
      body,
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(seen).toBe(body);
  });

  it('can be enabled by a profile and disabled per function', async () => {
    const app: AppHttpConfig = {
      profiles: { uploads: { multipartBodyParser: {} } },
    };
    const body = multipartBody(formParts);

    const enabled = await run({
      contentType: multipartContentType,
      body,
      app,
      fn: { profile: 'uploads' },
    });
    expect((enabled.seen as Record<string, unknown>).name).toBe('Aris');

    const disabled = await run({
      contentType: multipartContentType,
      body,
      app,
      fn: { profile: 'uploads', options: { multipartBodyParser: false } },
    });
    expect(disabled.seen).toBe(body);
  });

  it('can be enabled in app defaults', async () => {
    const { seen } = await run({
      contentType: multipartContentType,
      body: multipartBody(formParts),
      app: { defaults: { multipartBodyParser: {} } },
    });
    expect((seen as Record<string, unknown>).name).toBe('Aris');
  });

  it('passes other content types through untouched when enabled', async () => {
    const { res, seen } = await run({
      contentType: 'text/plain',
      body: 'hello',
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(res.statusCode).toBe(200);
    expect(seen).toBe('hello');
  });

  it('returns 415 for other content types when disableContentTypeError is false', async () => {
    const { res } = await run({
      contentType: 'text/plain',
      body: 'hello',
      fn: {
        options: { multipartBodyParser: { disableContentTypeError: false } },
      },
    });
    expect(res.statusCode).toBe(415);
  });

  it('skips empty bodies', async () => {
    const { res, seen } = await run({
      contentType: multipartContentType,
      body: '',
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(res.statusCode).toBe(200);
    expect(seen).toBe('');
  });

  it('leaves quoted boundaries unparsed (parser content-type pattern)', async () => {
    const body = multipartBody(formParts);
    const { seen } = await run({
      contentType: `multipart/form-data; boundary="${boundary}"`,
      body,
      fn: { options: { multipartBodyParser: {} } },
    });
    expect(seen).toBe(body);
  });

  it('passes busboy limits through to the parser', async () => {
    const { res } = await run({
      contentType: multipartContentType,
      body: multipartBody(formParts),
      fn: {
        options: {
          multipartBodyParser: { busboy: { limits: { fileSize: 3 } } },
        },
      },
    });
    expect(res.statusCode).toBe(413);
  });
});
