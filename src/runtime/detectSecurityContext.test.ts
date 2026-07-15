import type {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
} from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import {
  createApiGatewayV1Event,
  createApiGatewayV2Event,
} from '@/src/test/aws';

import { detectSecurityContext, isV1 } from './detectSecurityContext';

/**
 * Create a V2 event whose requestContext is *typed* to include an authorizer,
 * without using `any` or unsafe member access.
 */
const createV2WithAuthorizer = (
  authorizer: unknown,
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 => {
  const base = createApiGatewayV2Event(
    overrides.headers as Record<string, string> | undefined,
  );

  const ctx = {
    ...base.requestContext,
    authorizer,
  } as APIGatewayEventRequestContextV2 & { authorizer: unknown };

  return {
    ...base,
    ...overrides,
    requestContext: ctx,
  };
};

describe('isV1', () => {
  it('returns true for a V1 event and false for a V2 event', () => {
    const v1 = createApiGatewayV1Event('GET');
    const v2 = createApiGatewayV2Event();
    expect(isV1(v1)).toBe(true);
    expect(isV1(v2)).toBe(false);
  });
});

describe('detectSecurityContext', () => {
  it('V1: returns "my" when authorizer is present', () => {
    const base = createApiGatewayV1Event('GET');

    const identity: APIGatewayProxyEvent['requestContext']['identity'] = {
      ...base.requestContext.identity,
      apiKeyId: null,
      apiKey: null,
    };

    const requestContext: APIGatewayProxyEvent['requestContext'] = {
      ...base.requestContext,
      identity,
      // truthy object indicates an authenticated request
      authorizer: {},
    };

    const v1: APIGatewayProxyEvent = { ...base, requestContext };
    expect(detectSecurityContext(v1)).toBe('my');
  });

  it('V1: returns "private" when API key present (no authorizer)', () => {
    const base = createApiGatewayV1Event('GET');

    const identity: APIGatewayProxyEvent['requestContext']['identity'] = {
      ...base.requestContext.identity,
      apiKeyId: 'id-123',
      apiKey: null,
    };

    const requestContext: APIGatewayProxyEvent['requestContext'] = {
      ...base.requestContext,
      identity,
      authorizer: undefined,
    };

    const v1: APIGatewayProxyEvent = { ...base, requestContext };
    expect(detectSecurityContext(v1)).toBe('private');
  });

  it('V1: returns "public" when no authorizer and no API key', () => {
    const base = createApiGatewayV1Event('GET');

    const identity: APIGatewayProxyEvent['requestContext']['identity'] = {
      ...base.requestContext.identity,
      apiKeyId: null,
      apiKey: null,
    };

    const requestContext: APIGatewayProxyEvent['requestContext'] = {
      ...base.requestContext,
      identity,
      authorizer: undefined,
    };

    const v1: APIGatewayProxyEvent = { ...base, requestContext };
    expect(detectSecurityContext(v1)).toBe('public');
  });

  it('V2: returns "my" when an authorizer (jwt/iam/lambda) is present', () => {
    const v2 = createV2WithAuthorizer({ jwt: { claims: {} } });
    expect(detectSecurityContext(v2)).toBe('my');
  });

  it('V2: returns "private" when x-api-key header present (case-insensitive)', () => {
    const v2 = createApiGatewayV2Event({ 'X-API-Key': 'abc123' });
    expect(detectSecurityContext(v2)).toBe('private');
  });

  it('V2: returns "public" when no authorizer and no x-api-key', () => {
    const v2 = createApiGatewayV2Event();
    expect(detectSecurityContext(v2)).toBe('public');
  });

  it('V2: returns "my" when Authorization header contains AWS SigV4', () => {
    const v2 = createApiGatewayV2Event({
      authorization:
        'AWS4-HMAC-SHA256 Credential=AKIA.../20250101/us-east-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=...',
    });
    expect(detectSecurityContext(v2)).toBe('my');
  });

  it('V1: returns "my" when identity.accessKey is present (no authorizer)', () => {
    const base = createApiGatewayV1Event('GET');
    const identity: APIGatewayProxyEvent['requestContext']['identity'] = {
      ...base.requestContext.identity,
      accessKey: 'AKIA...',
      apiKey: null,
      apiKeyId: null,
    };
    const requestContext: APIGatewayProxyEvent['requestContext'] = {
      ...base.requestContext,
      identity,
      authorizer: undefined,
    };
    expect(detectSecurityContext({ ...base, requestContext })).toBe('my');
  });
});
