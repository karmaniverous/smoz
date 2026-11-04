/**
 * Registry → Serverless functions aggregator.
 *
 * @returns NonNullable<AWS['functions']> with HTTP/non‑HTTP events attached.
 */
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AWS } from '@serverless/typescript';
import { packageDirectorySync } from 'package-directory';
import { omit } from 'radash';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import type {
  FunctionRegistration,
  FunctionServerlessConfig,
} from '@/src/core/functionOptions';
import { buildPathElements } from '@/src/http/buildPath';
import { resolveHttpFromFunctionConfig } from '@/src/http/resolveHttpFromFunctionConfig';
import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

export type ServerlessConfigLike = {
  httpContextEventMap: SecurityContextHttpEventMap;
  defaultHandlerFileName: string;
  defaultHandlerFileExport: string;
};

/**
 * One function definition: the function's `serverless` properties with the
 * SMOZ-owned keys on top, so `handler`, `events` and `environment` always
 * come from SMOZ.
 *
 * With `image` set, `handler` is omitted (Serverless rejects a function with
 * both). An `image` object without `command` gets `command: [handler]`; a
 * string `image` is left as is (its CMD must name the handler).
 */
const buildFunctionDefinition = (
  config: FunctionServerlessConfig | undefined,
  owned: { handler: string; events: unknown; environment: unknown },
): Record<string, unknown> => {
  // Strip owned keys even if a cast smuggled them in.
  const passthrough = omit((config ?? {}) as Record<string, unknown>, [
    'handler',
    'events',
    'environment',
  ]);
  const image = config?.image;
  if (image === undefined) return { ...passthrough, ...owned };
  const { handler, ...rest } = owned;
  return {
    ...passthrough,
    ...rest,
    image:
      typeof image === 'string' || image.command
        ? image
        : { ...image, command: [handler] },
  };
};

export const buildAllServerlessFunctions = (
  registry: Iterable<FunctionRegistration>,
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

    let events: unknown;
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
        r.endpointsRootAbs,
      );
      const ctxs = contexts.length > 0 ? contexts : (['public'] as const);
      events = ctxs.map((ctx) => {
        const elems = buildPathElements(basePath, ctx);
        const ctxPath = `/${elems.join('/')}`;
        const ctxEventProps = serverless.httpContextEventMap[ctx] as Record<
          string,
          unknown
        >;
        return {
          http: { method, path: ctxPath, ...ctxEventProps },
        };
      });
    } catch {
      events = r.serverlessExtras ?? [];
    }

    out[r.functionName] = buildFunctionDefinition(r.serverless, {
      handler,
      events,
      environment: buildFnEnv((r.fnEnvKeys ?? []) as readonly never[]),
    });
  }

  return out as NonNullable<AWS['functions']>;
};
