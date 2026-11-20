import { fn, responseSchema } from './lambda';

fn.openapi({
  summary: 'Hello',
  description: 'Return a simple OK payload.',
  responses: {
    200: {
      description: 'Ok',
      content: {
        'application/json': { schema: responseSchema },
      },
    },
  },
  tags: ['public'],
});

export {};
