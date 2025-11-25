import { fn, responseSchema } from './lambda';

type FnOpenApiApi = {
  openapi: (op: unknown) => void;
};

const reg = fn as unknown as FnOpenApiApi;

reg.openapi({
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
