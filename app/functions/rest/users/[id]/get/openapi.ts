import { fn, responseSchema } from './lambda';

fn.openapi({
  summary: 'Get user by id',
  description:
    'Returns the user with the specified id. Empty list when not found.',
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
  ],
  responses: {
    200: {
      description: 'User items (possibly empty)',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});

export {};
