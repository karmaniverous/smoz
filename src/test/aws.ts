import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  Context,
} from 'aws-lambda';

export const createApiGatewayV1Event = (
  method: string,
  headers?: Record<string, string>,
): APIGatewayProxyEvent =>
  ({
    httpMethod: method,
    headers: headers ?? {},
    body: undefined,
    isBase64Encoded: false,
    path: '/',
    queryStringParameters: null,
    pathParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '/',
    requestContext: {
      accountId: 'acc',
      apiId: 'api',
      httpMethod: method,
      identity: {} as unknown,
      path: '/',
      stage: 'test',
      requestId: 'req',
      requestTimeEpoch: Date.now(),
      resourceId: 'res',
      resourcePath: '/',
      authorizer: {},
      protocol: 'HTTP/1.1',
    } as unknown,
  }) as unknown as APIGatewayProxyEvent;

export const createApiGatewayV2Event = (
  headers?: Record<string, string>,
): APIGatewayProxyEventV2 =>
  ({
    version: '2.0',
    headers: headers ?? {},
    body: undefined,
    isBase64Encoded: false,
    routeKey: '$default',
    rawPath: '/',
    rawQueryString: '',
    requestContext: {
      accountId: 'acc',
      apiId: 'api',
      domainName: 'example.com',
      domainPrefix: 'ex',
      http: {
        method: 'GET',
        path: '/',
        protocol: 'HTTP/1.1',
        sourceIp: 'ip',
        userAgent: 'ua',
      },
      requestId: 'rid',
      routeKey: '$default',
      stage: 'test',
      time: '',
      timeEpoch: Date.now(),
    },
  }) as unknown as APIGatewayProxyEventV2;

export const createLambdaContext = (): Context => ({
  awsRequestId: 'test-req-id',
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'fn',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn',
  logGroupName: 'lg',
  logStreamName: 'ls',
  memoryLimitInMB: '128',
  getRemainingTimeInMillis: () => 1000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
});
