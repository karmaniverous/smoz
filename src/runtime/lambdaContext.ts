import type { Context } from 'aws-lambda';

/** Per-invocation fields of a stub Lambda `Context` (aws-lambda). */
export interface LambdaContextFields {
  awsRequestId: string;
  functionName: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  /** Value returned by `getRemainingTimeInMillis()`. */
  remainingTimeInMillis: number;
}

/**
 * Stub Lambda `Context` (aws-lambda) for handlers invoked outside AWS (the inline
 * dev server and tests).
 *
 * `done`, `fail` and `succeed` are Node 0.10 compatibility methods that
 * `aws-lambda` still declares on `Context` (deprecated). Handlers return
 * results or throw, so the stubs are no-ops that exist only to satisfy the
 * interface.
 */
export class StubLambdaContext implements Context {
  readonly awsRequestId: string;
  callbackWaitsForEmptyEventLoop = false;
  readonly functionName: string;
  readonly functionVersion = '$LATEST';
  readonly invokedFunctionArn: string;
  readonly logGroupName = 'lg';
  readonly logStreamName = 'ls';
  readonly memoryLimitInMB: string;
  /** Own (unbound-safe) function: middy reads it off the context and calls it detached. */
  readonly getRemainingTimeInMillis: () => number;

  constructor(fields: LambdaContextFields) {
    this.awsRequestId = fields.awsRequestId;
    this.functionName = fields.functionName;
    this.invokedFunctionArn = fields.invokedFunctionArn;
    this.memoryLimitInMB = fields.memoryLimitInMB;
    this.getRemainingTimeInMillis = () => fields.remainingTimeInMillis;
  }

  done(): void {
    // No-op: see class docs.
  }

  fail(): void {
    // No-op: see class docs.
  }

  succeed(): void {
    // No-op: see class docs.
  }
}
