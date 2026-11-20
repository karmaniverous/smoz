import { describe, expect, it } from 'vitest';

import { makeErrorExpose, statusForError } from './errorSteps';

type Req = Parameters<
  NonNullable<ReturnType<typeof makeErrorExpose>['onError']>
>[0];

/** Run the error-expose step on an error; returns the (mutated) error. */
const expose = async <E>(error: E): Promise<E> => {
  await makeErrorExpose().onError?.({ error } as unknown as Req);
  return error;
};

const withStatus = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });

describe('error-expose step', () => {
  it('maps zod errors without a status to 400', async () => {
    const err = await expose(
      Object.assign(new Error('bad'), { name: 'ZodError' }),
    );
    expect(err).toMatchObject({ statusCode: 400, expose: true });
    expect(JSON.parse(err.message)).toEqual({
      statusCode: 400,
      message: 'bad',
    });
  });

  it('maps "Invalid event" to 400: the client sent it', async () => {
    expect(await expose(new Error('Invalid event'))).toMatchObject({
      statusCode: 400,
    });
  });

  it('maps "Invalid response" to 500 with its message, even as a ZodError', async () => {
    const err = await expose(
      Object.assign(new Error('Invalid response'), { name: 'ZodError' }),
    );
    expect(err).toMatchObject({ statusCode: 500, expose: true });
    expect(JSON.parse(err.message)).toEqual({
      statusCode: 500,
      message: 'Invalid response',
    });
  });

  it('keeps an existing status code', async () => {
    const err = await expose(withStatus('Invalid event', 404));
    expect(err.statusCode).toBe(404);
    expect(JSON.parse(err.message)).toEqual({
      statusCode: 404,
      message: 'Invalid event',
    });
  });

  it('defaults other errors to 500', async () => {
    const err = (await expose(new Error(''))) as Error & { statusCode: number };
    expect(err.statusCode).toBe(500);
    expect(JSON.parse(err.message)).toEqual({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  });

  it('does not double-encode an already encoded message', async () => {
    const encoded = JSON.stringify({ statusCode: 418, message: 'teapot' });
    const err = await expose(withStatus(encoded, 418));
    expect(err.message).toBe(encoded);
  });

  it('ignores non-Error values', async () => {
    expect(await expose('nope')).toBe('nope');
  });
});

describe('statusForError', () => {
  it.each([
    ['Invalid response', 'Error', 500],
    ['Invalid response', 'ZodError', 500],
    ['Invalid event', 'Error', 400],
    ['anything', 'ZodError', 400],
    ['anything', 'TypeError', 500],
  ])('%s (%s) -> %i', (message, name, status) => {
    const error = Object.assign(new Error(message), { name });
    expect(statusForError(error)).toBe(status);
  });
});
