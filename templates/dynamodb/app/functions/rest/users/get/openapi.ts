import { fn, responseSchema } from './lambda';

// OpenAPI for GET /users (search)
fn.openapi({
  summary: 'Search users',
  description:
    'Search users by beneficiary, name, phone, and created/updated ranges. Returns items and an optional pageKeyMap for paging.',
  parameters: [
    {
      name: 'beneficiaryId',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
    {
      name: 'createdFrom',
      in: 'query',
      required: false,
      schema: { type: 'number' },
    },
    {
      name: 'createdTo',
      in: 'query',
      required: false,
      schema: { type: 'number' },
    },
    {
      name: 'name',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Prefix; case/diacritic-insensitive',
    },
    {
      name: 'pageKeyMap',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
    { name: 'phone', in: 'query', required: false, schema: { type: 'string' } },
    {
      name: 'sortDesc',
      in: 'query',
      required: false,
      schema: { type: 'boolean' },
    },
    {
      name: 'sortOrder',
      in: 'query',
      required: false,
      schema: { type: 'string', enum: ['created', 'name', 'updated'] },
    },
    {
      name: 'updatedFrom',
      in: 'query',
      required: false,
      schema: { type: 'number' },
    },
    {
      name: 'updatedTo',
      in: 'query',
      required: false,
      schema: { type: 'number' },
    },
  ],
  responses: {
    200: {
      description: 'Search results',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: ['users'],
});

export {};
