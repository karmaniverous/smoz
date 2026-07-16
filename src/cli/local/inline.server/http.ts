import type http from 'node:http';
import { URL } from 'node:url';

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import type { HttpContext } from '@/src/types/HttpContext';

import type { Route, Segment } from './routes';

const firstVal = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;
const arrVal = (v: string | string[] | undefined): string[] | undefined =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v : undefined;

const toHeaders = (
  raw: http.IncomingHttpHeaders,
): { single: Record<string, string>; multi: Record<string, string[]> } => {
  const single: Record<string, string> = {};
  const multi: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw)) {
    const fv = firstVal(v);
    const av = arrVal(v);
    if (typeof fv === 'string') single[k] = fv;
    if (Array.isArray(av)) multi[k] = av;
  }
  return { single, multi };
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c))),
    );
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', () => {
      resolve('');
    });
  });

export const match = (
  segs: Segment[],
  pathName: string,
): { ok: boolean; params: Record<string, string> } => {
  const parts: string[] = pathName
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  if (parts.length !== segs.length) return { ok: false, params: {} };
  const params: Record<string, string> = {};
  for (let i = 0; i < segs.length; i += 1) {
    const seg = segs[i]!;
    const p = parts[i]!;
    if (seg.literal) {
      if (seg.literal !== p) return { ok: false, params: {} };
    } else if (seg.key) {
      params[seg.key] = p;
    }
  }
  return { ok: true, params };
};

/**
 * Decode JWT payload without signature validation (local dev only).
 * Returns the parsed claims object, or an empty object on failure.
 */
const decodeJwtClaims = (token: string): Record<string, unknown> => {
  try {
    const parts = token.replace(/^Bearer\s+/i, '').split('.');
    if (parts.length < 2) return {};
    const payload = Buffer.from(parts[1]!, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(payload);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

/**
 * Build a local-dev authorizer that makes `detectSecurityContext`
 * return the correct context for the route.
 *
 * Only populates the authorizer when the client actually sends
 * credentials, so `detectSecurityContext` reflects reality:
 * - `my` route + JWT in Authorization header → decoded claims.
 * - `private` route → no authorizer; the forwarded `x-api-key`
 *   header is enough for `detectSecurityContext`.
 * - No credentials → empty authorizer → `public`.
 */
const buildLocalAuthorizer = (
  context: HttpContext,
  authHeader: string | undefined,
): Record<string, unknown> | undefined => {
  if (context === 'my' && authHeader) {
    const claims = decodeJwtClaims(authHeader);
    if (Object.keys(claims).length > 0) return { claims };
  }
  // Return undefined so detectSecurityContext sees no authorizer,
  // rather than {} which it treats as truthy.
  return undefined;
};

export const toEvent = async (
  req: http.IncomingMessage,
  route: Route,
  params: Record<string, string>,
): Promise<APIGatewayProxyEvent> => {
  const url = new URL(
    req.url ?? '/',
    `http://${req.headers.host ?? 'localhost'}`,
  );
  const { single, multi } = toHeaders(req.headers);
  const method = (req.method ?? '').toUpperCase();
  const stage = process.env.SMOZ_STAGE ?? 'dev';
  const search = new URLSearchParams(url.search);
  const query: Record<string, string> = {};
  const mquery: Record<string, string[]> = {};
  for (const key of Array.from(new Set(search.keys()))) {
    const vals = search.getAll(key);
    if (vals.length > 0) {
      query[key] = vals[0]!;
      mquery[key] = vals;
    }
  }

  let body = '';
  if (method !== 'GET' && method !== 'HEAD') {
    body = await readBody(req);
  }

  return {
    httpMethod: method,
    headers: single,
    multiValueHeaders: multi,
    body,
    isBase64Encoded: false,
    path: url.pathname,
    queryStringParameters: Object.keys(query).length ? query : {},
    multiValueQueryStringParameters: Object.keys(mquery).length ? mquery : {},
    pathParameters: Object.keys(params).length ? params : {},
    stageVariables: null,
    resource: route.pattern,
    requestContext: {
      accountId: 'acc',
      apiId: 'inline',
      httpMethod: method,
      identity: {},
      path: url.pathname,
      stage,
      requestId: String(Date.now()),
      requestTimeEpoch: Date.now(),
      resourceId: 'res',
      resourcePath: route.pattern,
      authorizer: buildLocalAuthorizer(route.context, single['authorization']),
      protocol: 'HTTP/1.1',
    } as unknown,
  } as unknown as APIGatewayProxyEvent;
};

export const writeResult = (
  res: http.ServerResponse,
  result: APIGatewayProxyResult,
): void => {
  const status =
    typeof result.statusCode === 'number' ? result.statusCode : 200;
  const headers = result.headers ?? {};
  const body = typeof result.body === 'string' ? result.body : '';
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string') res.setHeader(k, v);
  }
  res.statusCode = status;
  res.end(body);
};
