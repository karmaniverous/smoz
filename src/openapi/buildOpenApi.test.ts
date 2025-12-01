/* REQUIREMENTS ADDRESSED (TEST)
- OpenAPI aggregator: build per-context path items with augmented summaries,
  tags, and composed operationIds; cross-platform URL/path handling.
*/
import { describe, expect, it } from 'vitest';

import {
  buildAllOpenApiPaths,
  type RegEntry,
} from '@/src/openapi/buildOpenApi';

describe('openapi/buildAllOpenApiPaths', () => {
  it('builds path items per context with augmented summary, tags, and composed operationIds', () => {
    const fileUrl =
      process.platform === 'win32'
        ? new URL(
            'file:///C:/tmp/sandbox/app/functions/rest/users/get/openapi.ts',
          )
        : new URL(
            'file:///tmp/sandbox/app/functions/rest/users/get/openapi.ts',
          );
    const endpointsRoot =
      process.platform === 'win32'
        ? 'C:/tmp/sandbox/app/functions/rest'
        : '/tmp/sandbox/app/functions/rest';
    const reg: RegEntry[] = [
      {
        functionName: 'users_get',
        eventType: 'rest',
        method: 'get',
        basePath: 'users',
        httpContexts: ['public', 'private'],
        callerModuleUrl: fileUrl.href,
        endpointsRootAbs: endpointsRoot,
        openapiBaseOperation: {
          summary: 'List users',
          description: 'Return a list of users.',
          tags: ['users'],
          responses: {},
        },
      },
    ];
    const paths = buildAllOpenApiPaths(reg);
    expect(paths).toHaveProperty('/users');
    expect(paths).toHaveProperty('/private/users');
    const pub = (paths as Record<string, unknown>)['/users'] as Record<
      string,
      unknown
    >;
    const priv = (paths as Record<string, unknown>)['/private/users'] as Record<
      string,
      unknown
    >;
    const pubGet = pub.get as {
      operationId: string;
      summary: string;
      tags: string[];
    };
    const privGet = priv.get as {
      operationId: string;
      summary: string;
      tags: string[];
    };
    expect(pubGet.operationId).toBe('users_get');
    expect(privGet.operationId).toBe('private_users_get');
    expect(pubGet.summary).toMatch(/List users \(public\)/i);
    expect(privGet.summary).toMatch(/List users \(private\)/i);
    expect(pubGet.tags).toEqual(expect.arrayContaining(['users', 'public']));
    expect(privGet.tags).toEqual(expect.arrayContaining(['users', 'private']));
  });

  it('builds path items with sanitized operationIds for path parameters', () => {
    const fileUrl =
      process.platform === 'win32'
        ? new URL(
            'file:///C:/tmp/sandbox/app/functions/rest/users/[userId]/get/openapi.ts',
          )
        : new URL(
            'file:///tmp/sandbox/app/functions/rest/users/[userId]/get/openapi.ts',
          );
    const endpointsRoot =
      process.platform === 'win32'
        ? 'C:/tmp/sandbox/app/functions/rest'
        : '/tmp/sandbox/app/functions/rest';
    const reg: RegEntry[] = [
      {
        functionName: 'users_userId_get',
        eventType: 'rest',
        method: 'get',
        basePath: 'users/[userId]', // use brackets to test sanitization
        httpContexts: ['public'],
        callerModuleUrl: fileUrl.href,
        endpointsRootAbs: endpointsRoot,
        openapiBaseOperation: {
          summary: 'Get user',
          description: 'Get a user by ID.',
          tags: ['users'],
          responses: {},
        },
      },
    ];
    const paths = buildAllOpenApiPaths(reg);
    expect(paths).toHaveProperty('/users/{userId}');
    const pathItem = (paths as Record<string, unknown>)[
      '/users/{userId}'
    ] as Record<string, unknown>;
    const op = pathItem.get as { operationId: string };
    expect(op.operationId).toBe('users_userId_get');
  });
});
