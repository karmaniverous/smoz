import { existsSync } from 'node:fs';
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

type FunctionDef = {
  handler?: string;
  image?: string | { command?: unknown[] };
  events?: Array<{ http?: { method?: string; path?: string } }>;
};

/**
 * Handler string of a function definition: `handler`, else (container image
 * functions) the `image.command` SMOZ defaults to the derived handler.
 */
const handlerOf = (def: FunctionDef): string | undefined => {
  if (typeof def.handler === 'string') return def.handler;
  const cmd =
    typeof def.image === 'object' ? def.image.command?.[0] : undefined;
  return typeof cmd === 'string' ? cmd : undefined;
};

/**
 * Build route table from the downstream app's aggregated serverless functions.
 *
 * Container image functions are served from `image.command[0]` when it names
 * a handler module in the project; otherwise they are skipped with a notice.
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

  for (const [name, defUnknown] of Object.entries(fns)) {
    const def = defUnknown as FunctionDef;
    if (!Array.isArray(def.events)) continue;
    const handlerRef = handlerOf(def);
    const isImage = def.image !== undefined;
    if (handlerRef === undefined) {
      if (isImage)
        console.warn(
          `[inline] Skipping "${name}": its container image doesn't name a handler module. ` +
            'Set serverless.image as an object without command (SMOZ then sets command to the handler) to serve it inline.',
        );
      continue;
    }

    const [moduleRel, exportName] = (() => {
      const lastDot = handlerRef.lastIndexOf('.');
      if (lastDot < 0) return [handlerRef, 'handler'] as const;
      return [
        handlerRef.slice(0, lastDot),
        handlerRef.slice(lastDot + 1),
      ] as const;
    })();

    // Resolve TS source module; dev runs via tsx so TS imports are OK
    const candidates = [
      path.resolve(root, `${moduleRel}.ts`),
      path.resolve(root, `${moduleRel}.mts`),
      path.resolve(root, `${moduleRel}.js`),
      path.resolve(root, `${moduleRel}.mjs`),
    ];
    // A custom image command may not name a module in the project.
    if (isImage && !existsSync(candidates[0]!)) {
      console.warn(
        `[inline] Skipping "${name}": image.command "${handlerRef}" is not a handler module in this project.`,
      );
      continue;
    }
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
