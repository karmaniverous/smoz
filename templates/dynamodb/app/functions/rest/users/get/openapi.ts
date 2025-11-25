import { fn, responseSchema } from './lambda';

type FnOpenApiApi = {
  openapi: (op: unknown) => void;
};

const reg = fn as unknown as FnOpenApiApi;

reg.openapi({
  summary: 'Search users',
  description:
    'Query users by created/updated ranges, beneficiary scope, name or phone.',
  responses: {
    200: {
      description: 'Search results',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});
