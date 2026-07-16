import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

import { inferContextFromPath } from '@/src/http/buildPath';
import type { HttpContext } from '@/src/types/HttpContext';

import type { AppLike } from './loaders';

export type Segment = {
  literal?: string;
  key?: string;
};

export type Route = {
  method: string; // UPPER
  pattern: string; // e.g., /users/{id}
  segs: Segment[];
  /** module.export (from handler string) */
  handlerRef: string;
  /** HTTP security context */
  context: HttpContext;
  handler: (
    e: APIGatewayProxyEvent,
    c: Context,
  ) => Promise<APIGatewayProxyResult>;
};

export const splitPattern = (p: string): Segment[] =>
  p
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .map((s) =>
      s.startsWith('{') && s.endsWith('}')
        ? { key: s.slice(1, -1) }
        : { literal: s },
    );

/**
 * Build route table from the downstream app's aggregated serverless functions.
 */
export const loadHandlers = async (
  root: string,
  app: AppLike,
): Promise<Route[]> => {
  const fns = app.buildAllServerlessFunctions() as Record<
    string,
    { handler?: unknown; events?: unknown }
  >;
  const routes: Route[] = [];

  for (const [, defUnknown] of Object.entries(fns)) {
    const def = defUnknown as {
      handler?: string;
      events?: Array<{ http?: { method?: string; path?: string } }>;
    };

    if (typeof def.handler !== 'string' || !Array.isArray(def.events)) continue;

    const [moduleRel, exportName] = (() => {
      const lastDot = def.handler.lastIndexOf('.');
      if (lastDot < 0) return [def.handler, 'handler'] as const;
      return [
        def.handler.slice(0, lastDot),
        def.handler.slice(lastDot + 1),
      ] as const;
    })();

    // Resolve TS source module; dev runs via tsx so TS imports are OK
    const candidates = [
      path.resolve(root, `${moduleRel}.ts`),
      path.resolve(root, `${moduleRel}.mts`),
      path.resolve(root, `${moduleRel}.js`),
      path.resolve(root, `${moduleRel}.mjs`),
    ];
    // Always try the first candidate (TS is expected in authoring).
    const modUrl = pathToFileURL(candidates[0]!).href;
    const mod = (await import(modUrl)) as Record<string, unknown>;
    const handler = mod[exportName];
    if (typeof handler !== 'function') continue;

    for (const evt of def.events) {
      const httpEvt = evt.http;
      const method = (httpEvt?.method ?? '').toUpperCase();
      const pattern = '/' + (httpEvt?.path ?? '').replace(/^\/+/, '');
      if (!method || !pattern) continue;

      const context: HttpContext = inferContextFromPath(pattern);

      routes.push({
        method,
        pattern,
        segs: splitPattern(pattern),
        handlerRef: `${moduleRel}.${exportName}`,
        context,
        handler: handler as Route['handler'],
      });
    }
  }

  return routes;
};
