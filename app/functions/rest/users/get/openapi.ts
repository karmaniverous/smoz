import { fn, responseSchema, searchQuerySchema } from './lambda';

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
      name: 'name',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Prefix; case/diacritic-insensitive',
    },
    { name: 'phone', in: 'query', required: false, schema: { type: 'string' } },
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
    {
      name: 'sortOrder',
      in: 'query',
      required: false,
      schema: { type: 'string', enum: ['created', 'name', 'updated'] },
    },
    {
      name: 'sortDesc',
      in: 'query',
      required: false,
      schema: { type: 'boolean' },
    },
    {
      name: 'pageKeyMap',
      in: 'query',
      required: false,
      schema: { type: 'string' },
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
