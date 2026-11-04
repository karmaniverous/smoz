import type http from 'node:http';
import { URL } from 'node:url';

import type { Context } from 'aws-lambda';

import { match, toEvent, writeResult } from './http';
import type { Route } from './routes';

/** Lambda context stub passed to every inline handler. */
const lambdaContext = (): Context => ({
  awsRequestId: String(Date.now()),
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'inline',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:inline',
  logGroupName: 'lg',
  logStreamName: 'ls',
  memoryLimitInMB: '256',
  getRemainingTimeInMillis: () => 30000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
});

/** Write a JSON error response. */
const sendError = (
  res: http.ServerResponse,
  statusCode: number,
  error: string,
): void => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error }));
};

/**
 * Request listener for the inline server: route the request, map it to an
 * API Gateway v1 event (encoding `binaryMediaTypes` bodies as API Gateway
 * does), invoke the handler and write its result.
 */
export const createListener =
  (
    routes: readonly Route[],
    binaryMediaTypes: readonly string[],
  ): http.RequestListener =>
  (req, res) => {
    void (async () => {
      try {
        const method = (req.method ?? '').toUpperCase();
        const url = new URL(
          req.url ?? '/',
          `http://${req.headers.host ?? 'localhost'}`,
        );
        // Allow HEAD to match GET routes; the wrapped handler/middleware will
        // short-circuit HEAD requests to 200 {} and set Content-Type.
        const searchMethod = method === 'HEAD' ? 'GET' : method;
        const route = routes.find(
          (r) => r.method === searchMethod && match(r.segs, url.pathname).ok,
        );
        if (!route) {
          sendError(res, 404, 'Not Found');
          return;
        }
        const { params } = match(route.segs, url.pathname);
        const evt = await toEvent(req, route, params, binaryMediaTypes);
        writeResult(res, await route.handler(evt, lambdaContext()));
      } catch (e) {
        sendError(res, 500, (e as Error).message);
      }
    })();
  };
