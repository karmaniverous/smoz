import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiGatewayV1Event } from '@/src/test/aws';

describe('multipart body parser: package not installed', () => {
  afterEach(() => {
    vi.doUnmock('@middy/http-multipart-body-parser');
    vi.resetModules();
  });

  it('fails with an actionable error on the first request with a body', async () => {
    vi.resetModules();
    vi.doMock('@middy/http-multipart-body-parser', () => {
      throw new Error('Cannot find package');
    });
    const { makeMultipartBodyParser } = await import('./defaultSteps');
    const step = makeMultipartBodyParser({});

    const event = createApiGatewayV1Event('POST', {
      'Content-Type': 'multipart/form-data; boundary=x',
    });
    event.body = '--x--\r\n';
    const request = { event } as never;

    await expect(step.before?.(request)).rejects.toThrow(
      /multipartBodyParser is enabled but '@middy\/http-multipart-body-parser' could not be loaded/,
    );
  });
});
