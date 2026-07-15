/**
 * @module Response shaping helpers for HTTP middleware.
 *
 * Shared utilities for detecting and normalising Lambda Proxy response
 * envelopes, used by both the `after` and `onError` middleware paths.
 * Also exports dedicated `onError` steps that apply CORS headers and
 * response shaping after `errorHandler` — necessary because middy v6+
 * does not re-run the `after` chain on the error path.
 */
import httpCors from '@middy/http-cors';

import { tagStep } from '@/src/http/middleware/transformUtils';

import type { ApiMiddleware, HttpStackOptions } from './types';

type M = ApiMiddleware;

/**
 * Detect a shaped Lambda Proxy response.
 *
 * A response is "shaped" when it has a numeric `statusCode` property —
 * the definitive marker of an API-Gateway-style response envelope.
 * Missing `headers` or `body` are defaulted by {@link shapeResponse}
 * rather than treated as "unshaped", because `{ statusCode, headers }`
 * (no body) is a valid Lambda Proxy return value.
 */
export const isShapedResponse = (
  v: unknown,
): v is {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
} =>
  typeof v === 'object' &&
  v !== null &&
  'statusCode' in (v as Record<string, unknown>) &&
  typeof (v as Record<string, unknown>).statusCode === 'number';

/**
 * Shape the response into a well-formed Lambda Proxy result.
 *
 * Shaped responses (detected via {@link isShapedResponse}) are normalised
 * in-place — missing `headers` and `body` are defaulted.  Non-shaped
 * values are wrapped in a `200` envelope.
 */
export const shapeResponse = (
  current: unknown,
  contentType: string,
): { statusCode: number; headers: Record<string, string>; body: unknown } => {
  let res: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
  if (isShapedResponse(current)) {
    res = current;
  } else {
    res = { statusCode: 200, headers: {}, body: current };
  }
  // Default missing fields for shaped responses without body/headers.
  if (res.body === undefined) res.body = '';
  if (res.body !== undefined && typeof res.body !== 'string') {
    try {
      res.body = JSON.stringify(res.body);
    } catch {
      res.body = String(res.body);
    }
  }
  const headers: Record<string, string> = res.headers ?? {};
  headers['Content-Type'] = contentType;
  res.headers = headers;
  return res as {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
  };
};

/**
 * Apply CORS headers to error responses.
 *
 * middy v6+ does not re-run the `after` chain after `onError` handles an
 * error, so the regular CORS `after` hook never fires for error responses.
 * This dedicated `onError` step runs *after* the error handler has set
 * `request.response`, ensuring CORS headers are present on error responses.
 */
export const makeOnErrorCors = (opts?: HttpStackOptions): M => {
  const cors = httpCors({
    credentials: true,
    getOrigin: (o: string) => o,
    ...(opts?.cors ?? {}),
  });
  return tagStep(
    {
      onError: async (request) => {
        if ((request as { response?: unknown }).response === undefined) return;
        if (cors.after) await cors.after(request as never);
      },
    },
    'error-cors',
  );
};

/**
 * Shape error responses into well-formed Lambda Proxy results.
 *
 * Mirrors `makeShapeAndContentType` but runs on the `onError` path,
 * ensuring error responses have proper `statusCode`, `headers`, and
 * `body` structure even when the `after` chain is skipped.
 */
export const makeOnErrorShape = (contentType: string): M =>
  tagStep(
    {
      onError: (request) => {
        const container = request as unknown as { response?: unknown };
        if (container.response === undefined) return;
        container.response = shapeResponse(container.response, contentType);
      },
    },
    'error-shape',
  );
