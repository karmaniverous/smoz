import { fn, putBodySchema, responseSchema } from './lambda';

fn.openapi({
  summary: 'Update user (shallow)',
  description:
    'Shallow update — undefined ignored; null deletes optional properties. Returns updated items.',
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
  ],
  requestBody: {
    description: 'Update payload',
    content: { 'application/json': { schema: putBodySchema } },
  },
  responses: {
    200: {
      description: 'Updated items',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});

export {};
