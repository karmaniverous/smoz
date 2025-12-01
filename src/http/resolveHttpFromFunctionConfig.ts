import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { unique } from 'radash';
import type { z } from 'zod';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import { sanitizeBasePath } from '@/src/http/buildPath';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';

export const HTTP_METHODS: ReadonlySet<MethodKey> = new Set<MethodKey>([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

/**
 * Resolve `(method, basePath, contexts)` for an HTTP function definition.
 *
 * @typeParam EventSchema    - optional event Zod schema
 * @typeParam ResponseSchema - optional response Zod schema
 * @typeParam GlobalParams   - app global params type
 * @typeParam StageParams    - app stage params type
 * @typeParam EventTypeMap   - event type token map
 * @typeParam EventType      - selected event token
 * @param functionConfig - the per‑function config (may omit method/basePath)
 * @param callerModuleUrl - import.meta.url of the registering module
 * @param restRootAbs - absolute root of endpoints
 * @throws Error if method/basePath cannot be inferred under endpoints root
 * @returns HTTP method key, basePath, and unique contexts list
 */
export const resolveHttpFromFunctionConfig = <
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    GlobalParams,
    StageParams,
    EventTypeMap,
    EventType
  >,
  callerModuleUrl: string,
  restRootAbs: string,
): {
  method: MethodKey;
  basePath: string;
  contexts: readonly HttpContext[];
} => {
  const {
    method: maybeMethod,
    basePath: maybeBase,
    httpContexts,
  } = functionConfig as {
    method?: MethodKey;
    basePath?: string;
    httpContexts?: readonly HttpContext[];
  };

  // Compute relative path from endpoints root to the caller directory
  const relPath = relative(restRootAbs, dirname(fileURLToPath(callerModuleUrl)))
    .split(sep)
    .join('/');
  const underEndpointsRoot = !relPath.startsWith('..');

  let method: MethodKey;
  if (maybeMethod && HTTP_METHODS.has(maybeMethod)) {
    method = maybeMethod;
  } else {
    if (!underEndpointsRoot) {
      throw new Error(
        'resolveHttpFromFunctionConfig: method missing and caller is not under endpoints root; provide method explicitly.',
      );
    }
    const segs = relPath.split('/').filter(Boolean);
    const tail = segs[segs.length - 1]?.toLowerCase();
    if (HTTP_METHODS.has(tail as MethodKey)) method = tail as MethodKey;
    else
      throw new Error(
        'resolveHttpFromFunctionConfig: cannot infer method from folder; provide method explicitly.',
      );
  }

  let basePath = sanitizeBasePath(maybeBase ?? '');
  if (!basePath) {
    if (!underEndpointsRoot) {
      throw new Error(
        'resolveHttpFromFunctionConfig: basePath missing and caller is not under endpoints root; provide basePath explicitly.',
      );
    }
    const segs = relPath.split('/').filter(Boolean);
    if (segs.length && segs[segs.length - 1]?.toLowerCase() === method)
      segs.pop();
    basePath = segs.join('/');
  }

  if (!basePath) {
    throw new Error(
      'resolveHttpFromFunctionConfig: derived basePath is empty; ensure file is under endpoints root or set config.basePath.',
    );
  }

  const contexts = unique(httpContexts ?? []);
  return { method, basePath, contexts };
};
