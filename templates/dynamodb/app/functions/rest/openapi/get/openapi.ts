import { fn, responseSchema } from './lambda';

type FnOpenApiApi = {
  openapi: (op: unknown) => void;
};

const reg = fn as unknown as FnOpenApiApi;

reg.openapi({
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
