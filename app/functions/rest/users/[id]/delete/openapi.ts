import { fn } from './lambda';

fn.openapi({
  summary: 'Delete user',
  description: 'Delete all records for the specified user id.',
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
  ],
  responses: {
    204: { description: 'No Content' },
  },
  tags: ['users'],
});

export {};
