import { fn, responseSchema } from './lambda';

type FnOpenApiApi = {
  openapi: (op: unknown) => void;
};

const reg = fn as unknown as FnOpenApiApi;

reg.openapi({
  summary: 'Update user',
  description: 'Shallow update semantics; null deletes optional props.',
  responses: {
    200: {
      description: 'Updated user(s)',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});
