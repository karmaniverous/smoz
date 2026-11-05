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
import type {
  DefineFunctionOptions,
  FunctionDefaults,
  FunctionRegistration,
} from '@/src/core/functionOptions';
import { handlerFactory } from '@/src/core/handlerFactory';
import { resolveFunctionOptions } from '@/src/core/resolveFunctionOptions';
import type { ZodObj } from '@/src/core/types';
import { selectHttpProfile } from '@/src/http/middleware/customization/profile';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import type { BaseOperation } from '@/src/openapi/types';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler } from '@/src/types/Handler';

/** A stored registry row: the resolved registration plus its branded runtime config. */
export type RegistryEntry = FunctionRegistration & {
  brandedConfig: Record<string, unknown>;
};

export const createRegistry = <
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
>(deps: {
  /** POSIX app root; eventType, endpointsRootAbs and functionName derive from it (or, bundled, from the caller's own path). */
  appRootAbs: string;
  /** Keys of the app's eventTypeMapSchema (valid derived event types). */
  eventTypeKeys: readonly string[];
  httpEventTypeTokens: readonly string[];
  env: {
    global: EnvSchemaNode<GlobalParamsSchema>;
    stage: EnvSchemaNode<StageParamsSchema>;
  };
  http: AppHttpConfig;
  functionDefaults?: FunctionDefaults;
}) => {
  const map = new Map<string, RegistryEntry>();
  return {
    defineFunction<
      EventType extends Extract<keyof z.infer<EventTypeMapSchema>, string>,
      EventSchema extends z.ZodType | undefined,
      ResponseSchema extends z.ZodType | undefined,
    >(
      options: DefineFunctionOptions<
        EventType,
        EventSchema,
        ResponseSchema,
        keyof (z.infer<GlobalParamsSchema> & z.infer<StageParamsSchema>)
      >,
    ) {
      const resolved = resolveFunctionOptions(options, deps);
      const key = resolved.functionName;
      // Fail at definition time, not on the first request.
      if (deps.httpEventTypeTokens.includes(resolved.eventType))
        selectHttpProfile({
          functionName: key,
          app: deps.http,
          fnDefaults: deps.functionDefaults?.http,
          fn: resolved.http,
        });
      const other = map.get(key);
      if (other) {
        throw new Error(
          `Duplicate functionName "${key}". Existing: ${other.callerModuleUrl}. New: ${resolved.callerModuleUrl}. Provide a unique functionName.`,
        );
      }

      // The single place the runtime config is built: everything resolved,
      // plus the env brand read by wrapHandler.
      const brandedConfig: Record<string, unknown> = {
        ...resolved,
        [ENV_CONFIG]: { global: deps.env.global, stage: deps.env.stage },
      };
      map.set(key, { ...resolved, brandedConfig });

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
          >(deps.httpEventTypeTokens, deps.http, deps.functionDefaults);
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
