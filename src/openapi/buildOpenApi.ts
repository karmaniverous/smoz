/**
 * Registry → OpenAPI path aggregator.
 *
 * @returns ZodOpenApiPathsObject; plug into `createDocument({ paths })`.
 */
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import { buildPathElements } from '@/src/http/buildPath';
import { resolveHttpFromFunctionConfig } from '@/src/http/resolveHttpFromFunctionConfig';
import type { BaseOperation } from '@/src/openapi/types';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';
export type RegEntry = {
  functionName: string;
  eventType: string;
  method?: MethodKey;
  basePath?: string;
  httpContexts?: readonly HttpContext[];
  callerModuleUrl: string;
  endpointsRootAbs: string;
  openapiBaseOperation?: BaseOperation;
};

export const buildAllOpenApiPaths = (
  registry: Iterable<RegEntry>,
): ZodOpenApiPathsObject => {
  const paths: Record<string, unknown> = {};

  for (const r of registry) {
    if (!r.openapiBaseOperation) continue;

    const { method, basePath, contexts } = resolveHttpFromFunctionConfig(
      {
        functionName: r.functionName,
        eventType: r.eventType as keyof BaseEventTypeMap,
        ...(r.method ? { method: r.method } : {}),
        ...(r.basePath ? { basePath: r.basePath } : {}),
        ...(r.httpContexts ? { httpContexts: r.httpContexts } : {}),
      } as unknown as {
        functionName: string;
        eventType: keyof BaseEventTypeMap;
        method?: MethodKey;
        basePath?: string;
        httpContexts?: readonly HttpContext[];
      },
      r.callerModuleUrl,
      r.endpointsRootAbs,
    );

    const ctxs = contexts.length > 0 ? contexts : (['public'] as const);
    for (const context of ctxs) {
      const elems = buildPathElements(basePath, context);
      const pathKey = `/${elems.join('/')}`;
      const operationIdSegs = elems.map((e) => e.replace(/^{|}$/g, ''));
      const op = {
        ...r.openapiBaseOperation,
        operationId: [...operationIdSegs, method].join('_'),
        summary: `${r.openapiBaseOperation.summary} (${context})`,
        tags: Array.from(
          new Set([...(r.openapiBaseOperation.tags ?? []), context]),
        ),
      };
      const existing: Record<string, unknown> =
        pathKey in paths ? (paths[pathKey] as Record<string, unknown>) : {};
      paths[pathKey] = { ...existing, [method]: op };
    }
  }

  return paths as ZodOpenApiPathsObject;
};
