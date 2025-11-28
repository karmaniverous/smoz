import { eventSchema, fn, responseSchema } from './lambda';

fn.openapi({
  summary: 'Create user',
  description: 'Create a new user record.',
  requestBody: {
    description: 'User payload',
    content: { 'application/json': { schema: eventSchema.shape.body } },
  },
  responses: {
    200: {
      description: 'Created user',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});

export {};
