import { describe, expect, it } from 'vitest';

import { StubLambdaContext } from './lambdaContext';

const fields = {
  awsRequestId: 'req-1',
  functionName: 'fn',
  invokedFunctionArn: 'arn:fn',
  memoryLimitInMB: '512',
  remainingTimeInMillis: 1234,
};

describe('StubLambdaContext', () => {
  it('carries the per-invocation fields and Lambda defaults', () => {
    expect(new StubLambdaContext(fields)).toMatchObject({
      awsRequestId: 'req-1',
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'fn',
      functionVersion: '$LATEST',
      invokedFunctionArn: 'arn:fn',
      logGroupName: 'lg',
      logStreamName: 'ls',
      memoryLimitInMB: '512',
    });
  });

  it('returns the remaining time even when the getter is called detached', () => {
    // middy reads getRemainingTimeInMillis off the context and calls it unbound.
    const { getRemainingTimeInMillis } = new StubLambdaContext(fields);
    expect(getRemainingTimeInMillis()).toBe(1234);
  });
});
