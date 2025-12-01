/**
 * Function registry.
 *
 * Stores per‑function definitions keyed by functionName and exposes:
 *  - defineFunction(options) → { handler, openapi, serverless }
 *  - values() → iterable entries for aggregation
 *
 * Intended for internal use by {@link App}.
 */
import type { z } from 'zod';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import type { EnvSchemaNode } from '@/src/core/defineAppConfig';
import type { EnvAttached } from '@/src/core/defineFunctionConfig';
import { ENV_CONFIG } from '@/src/core/defineFunctionConfig';
import { handlerFactory } from '@/src/core/handlerFactory';
import type { ZodObj } from '@/src/core/types';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import type { BaseOperation } from '@/src/openapi/types';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler } from '@/src/types/Handler';
import type { HttpContext } from '@/src/types/HttpContext';

export type RegistryEntry = {
  functionName: string;
  eventType: string;
  method?: MethodKey;
  basePath?: string;
  httpContexts?: readonly HttpContext[];
  contentType?: string;
  fnEnvKeys?: readonly PropertyKey[];
  eventSchema?: z.ZodType | undefined;
  responseSchema?: z.ZodType | undefined;
  openapiBaseOperation?: BaseOperation;
  serverlessExtras?: unknown;
  callerModuleUrl: string;
  restRootAbs: string;
  brandedConfig: Record<string, unknown>;
};

export const createRegistry = <
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
>(deps: {
  httpEventTypeTokens: readonly string[];
  env: {
    global: EnvSchemaNode<GlobalParamsSchema>;
    stage: EnvSchemaNode<StageParamsSchema>;
  };
  http: AppHttpConfig;
  functionDefaults?: {
    /** Default per-function env keys applied to all functions (merged). */
    fnEnvKeys?: readonly string[];
  };
}) => {
  const map = new Map<string, RegistryEntry>();
  return {
    defineFunction<
      EventType extends Extract<keyof z.infer<EventTypeMapSchema>, string>,
      EventSchema extends z.ZodType | undefined,
      ResponseSchema extends z.ZodType | undefined,
    >(options: {
      functionName: string;
      eventType: EventType;
      method?: MethodKey;
      basePath?: string;
      httpContexts?: readonly HttpContext[];
      contentType?: string;
      eventSchema?: EventSchema;
      responseSchema?: ResponseSchema;
      fnEnvKeys?: readonly (keyof (z.infer<GlobalParamsSchema> &
        z.infer<StageParamsSchema>))[];
      callerModuleUrl: string;
      restRootAbs: string;
    }) {
      const key = options.functionName;
      if (map.has(key)) {
        const other = map.get(key)!;
        throw new Error(
          `Duplicate functionName "${key}". Existing: ${other.callerModuleUrl}. New: ${options.callerModuleUrl}. Provide a unique functionName.`,
        );
      }
      // Merge default fnEnvKeys with per-function keys (unique, preserve order).
      const mergedFnEnvKeys = (() => {
        const out = new Set<PropertyKey>();
        (deps.functionDefaults?.fnEnvKeys ?? []).forEach((k) => out.add(k));
        (options.fnEnvKeys ?? []).forEach((k) => out.add(k));
        return Array.from(out);
      })();

      const brandedConfig = {
        functionName: options.functionName,
        eventType: options.eventType as string,
        ...(options.method ? { method: options.method } : {}),
        ...(options.basePath ? { basePath: options.basePath } : {}),
        ...(options.httpContexts ? { httpContexts: options.httpContexts } : {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
        ...(mergedFnEnvKeys.length
          ? { fnEnvKeys: mergedFnEnvKeys as readonly PropertyKey[] }
          : {}),
        ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
        ...(options.responseSchema
          ? { responseSchema: options.responseSchema }
          : {}),
        [ENV_CONFIG]: {
          global: deps.env.global,
          stage: deps.env.stage,
        } as {
          global: EnvSchemaNode<GlobalParamsSchema>;
          stage: EnvSchemaNode<StageParamsSchema>;
        },
      } as Record<string, unknown>;

      map.set(key, {
        functionName: options.functionName,
        eventType: options.eventType as string,
        ...(options.method ? { method: options.method } : {}),
        ...(options.basePath ? { basePath: options.basePath } : {}),
        ...(options.httpContexts ? { httpContexts: options.httpContexts } : {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
        ...(mergedFnEnvKeys.length
          ? { fnEnvKeys: mergedFnEnvKeys as readonly PropertyKey[] }
          : {}),
        ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
        ...(options.responseSchema
          ? { responseSchema: options.responseSchema }
          : {}),
        callerModuleUrl: options.callerModuleUrl,
        restRootAbs: options.restRootAbs,
        brandedConfig,
      });
      return {
        handler: (
          business: Handler<
            EventSchema,
            ResponseSchema,
            (z.infer<EventTypeMapSchema> & BaseEventTypeMap)[EventType]
          >,
        ) => {
          type GlobalParams = z.infer<GlobalParamsSchema>;
          type StageParams = z.infer<StageParamsSchema>;
          type EventTypeMapResolved = z.infer<EventTypeMapSchema> &
            BaseEventTypeMap;
          type FC = FunctionConfig<
            EventSchema,
            ResponseSchema,
            GlobalParams,
            StageParams,
            EventTypeMapResolved,
            EventType
          > &
            EnvAttached<GlobalParamsSchema, StageParamsSchema>;

          const fnConfig = brandedConfig as unknown as FC;
          const make = handlerFactory<
            GlobalParamsSchema,
            StageParamsSchema,
            EventTypeMapResolved,
            EventType,
            EventSchema,
            ResponseSchema
          >(deps.httpEventTypeTokens, deps.http);
          return make(fnConfig, business);
        },
        openapi: (baseOperation: BaseOperation) => {
          const r = map.get(key)!;
          r.openapiBaseOperation = baseOperation;
        },
        serverless: (extras: unknown) => {
          const r = map.get(key)!;
          r.serverlessExtras = extras;
        },
      };
    },
    values() {
      return map.values();
    },
  };
};
