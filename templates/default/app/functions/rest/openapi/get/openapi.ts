import { fn, responseSchema } from './lambda';

fn.openapi({
  summary: 'Get OpenAPI document',
  description:
    'Return the OpenAPI 3.1 document. Generate it via "npm run openapi".',
  responses: {
    200: {
      description: 'OpenAPI document',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['openapi'],
});
