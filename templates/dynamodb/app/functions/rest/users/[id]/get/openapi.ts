import { fn, responseSchema } from './lambda';

type FnOpenApiApi = {
  openapi: (op: unknown) => void;
};

const reg = fn as unknown as FnOpenApiApi;

reg.openapi({
  summary: 'Get user',
  description: 'Get a user by id.',
  responses: {
    200: {
      description: 'User or null',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});
