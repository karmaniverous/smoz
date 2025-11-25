import { fn, responseSchema } from './lambda';

type FnOpenApiApi = {
  openapi: (op: unknown) => void;
};

const reg = fn as unknown as FnOpenApiApi;

reg.openapi({
  summary: 'Delete user',
  description: 'Delete a user by id.',
  responses: {
    200: {
      description: 'Operation result',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});
