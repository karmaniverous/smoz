/**
 * Registry → Serverless functions aggregator.
 *
 * @returns NonNullable<AWS['functions']> with HTTP/non‑HTTP events attached.
 */
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AWS } from '@serverless/typescript';
import { packageDirectorySync } from 'package-directory';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import { resolveHttpFromFunctionConfig } from '@/src/http/resolveHttpFromFunctionConfig';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';

/** Registry entry for Serverless function building. */
export type RegEntry = {
  /** Function name. */
  functionName: string;
  /** Event type token. */
  eventType: string;
  /** HTTP method. */
  method?: MethodKey;
  /** HTTP base path. */
  basePath?: string;
  /** HTTP contexts. */
  httpContexts?: readonly HttpContext[];
  /** HTTP content type. */
  contentType?: string;
  /** Serverless extra configuration. */
  serverlessExtras?: unknown;
  /** Function-specific environment keys. */
  fnEnvKeys?: readonly PropertyKey[];
  /** Caller module URL. */
  callerModuleUrl: string;
  /** REST endpoints root path. */
  restRootAbs: string;
};

/** Serverless configuration subset used by the builder. */
export type ServerlessConfigLike = {
  /** Default handler file name. */
  defaultHandlerFileName: string;
  /** Default handler file export name. */
  defaultHandlerFileExport: string;
};

/**
 * Build all Serverless function definitions from the registry.
 *
 * @param registry - Iterator of registry entries.
 * @param serverless - Serverless configuration.
 * @param buildFnEnv - Helper to build function environment variables.
 * @returns Serverless functions object.
 */
export const buildAllServerlessFunctions = (
  registry: Iterable<RegEntry>,
  serverless: ServerlessConfigLike,
  buildFnEnv: (fnEnvKeys?: readonly never[]) => Record<string, string>,
): NonNullable<AWS['functions']> => {
  const out: Record<string, unknown> = {};
  const repoRoot = packageDirectorySync()!;

  for (const r of registry) {
    const callerDir = dirname(fileURLToPath(r.callerModuleUrl));
    const handlerFileAbs = join(callerDir, serverless.defaultHandlerFileName);
    const handlerFileRel = relative(repoRoot, handlerFileAbs)
      .split(sep)
      .join('/');
    const handler = `${handlerFileRel}.${serverless.defaultHandlerFileExport}`;

    let events: unknown = [];
    try {
      const { method, basePath, contexts } = resolveHttpFromFunctionConfig(
        {
          functionName: r.functionName,
          eventType: r.eventType as keyof BaseEventTypeMap,
          ...(r.method ? { method: r.method } : {}),
          ...(r.basePath ? { basePath: r.basePath } : {}),
          ...(r.httpContexts ? { httpContexts: r.httpContexts } : {}),
        },
        r.callerModuleUrl,
        r.restRootAbs,
      );
      const path = `/${basePath.replace(/^\/+/, '')}`;
      const ctxs = contexts.length > 0 ? contexts : (['public'] as const);
      events = ctxs.map(() => ({
        http: { method, path },
      }));
    } catch {
      events = r.serverlessExtras ?? [];
    }

    const def: Record<string, unknown> = {
      handler,
      events,
      environment: buildFnEnv((r.fnEnvKeys ?? []) as readonly never[]),
    };

    out[r.functionName] = def;
  }

  return out as NonNullable<AWS['functions']>;
};
