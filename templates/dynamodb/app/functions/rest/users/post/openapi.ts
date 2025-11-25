import { fn, responseSchema } from './lambda';

type FnOpenApiApi = {
  openapi: (op: unknown) => void;
};

const reg = fn as unknown as FnOpenApiApi;

reg.openapi({
  summary: 'Create user',
  description: 'Create a new user record.',
  responses: {
    200: {
      description: 'Created user',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});
