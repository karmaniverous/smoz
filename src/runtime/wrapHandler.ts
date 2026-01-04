/**
 * wrapHandler
 * - No glue: accepts a branded functionConfig and a business handler.
 *   Env (schemas + envKeys) is read from the branded config.
 * - Preserves HTTP/Non-HTTP split and middleware pipeline.
 */ import middy from '@middy/core';
import type { Context } from 'aws-lambda';
import type { z, ZodObject, ZodRawShape } from 'zod';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import type { EnvAttached } from '@/src/core/defineFunctionConfig';
import { getEnvFromFunctionConfig } from '@/src/core/defineFunctionConfig';
import { defaultHttpEventTypeTokens } from '@/src/core/httpTokens';
import {
  type AppHttpConfig,
  computeHttpMiddleware,
  type FunctionHttpConfig,
} from '@/src/http/middleware/httpStackCustomization';
import {
  buildEnvSchema,
  deriveAllKeys,
  parseTypedEnv,
  splitKeysBySchema,
} from '@/src/runtime/envBuilder';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler, ShapedEvent } from '@/src/types/Handler';

/**
 * Wrap a business handler with SMOZ runtime.
 *
 * - HTTP event tokens receive the full Middy pipeline (validation, shaping, CORS, etc.).
 * - Non‑HTTP tokens bypass Middy and call the business function directly.
 *
 * @typeParam GlobalParamsSchema - global params schema type
 * @typeParam StageParamsSchema  - stage params schema type
 * @typeParam EventTypeMap       - event token → runtime type map
 * @typeParam EventType          - a key of EventTypeMap
 * @typeParam EventSchema        - optional Zod schema for event (validated before handler)
 * @typeParam ResponseSchema     - optional Zod schema for response (validated after handler)
 * @param functionConfig - per‑function configuration (branded with env nodes)
 * @param business - the business handler implementation
 * @param opts - optional runtime overrides (e.g., widen HTTP tokens)
 * @returns a Lambda‑compatible handler function
 */
export function wrapHandler<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>(
  functionConfig: FunctionConfig<
    EventSchema,
    ResponseSchema,
    z.infer<GlobalParamsSchema>,
    z.infer<StageParamsSchema>,
    EventTypeMap,
    EventType
  > &
    EnvAttached<GlobalParamsSchema, StageParamsSchema>,
  business: Handler<EventSchema, ResponseSchema, EventTypeMap[EventType]>,
  opts?: {
    httpEventTypeTokens?: readonly string[];
    httpConfig?: AppHttpConfig;
  },
) {
  const assertKeysSubset = (
    schema: ZodObject<ZodRawShape>,
    keys: readonly string[],
    label: string,
  ): void => {
    const allowed = new Set(Object.keys(schema.shape));
    const bad = keys.filter((k) => !allowed.has(k));
    if (bad.length)
      throw new Error(`${label} contains unknown keys: ${bad.join(', ')}`);
  };
  const envConfig = getEnvFromFunctionConfig<
    GlobalParamsSchema,
    StageParamsSchema
  >(functionConfig);
  assertKeysSubset(
    envConfig.global.paramsSchema,
    envConfig.global.envKeys as readonly string[],
    'global.envKeys',
  );
  assertKeysSubset(
    envConfig.stage.paramsSchema,
    envConfig.stage.envKeys as readonly string[],
    'stage.envKeys',
  );

  return async (event: unknown, context: Context) => {
    // Compose typed env schema and parse process.env
    const all = deriveAllKeys(
      envConfig.global.envKeys as readonly PropertyKey[],
      envConfig.stage.envKeys as readonly PropertyKey[],
      (functionConfig.fnEnvKeys ?? []) as readonly PropertyKey[],
    );
    const { globalPick, stagePick } = splitKeysBySchema(
      all,
      envConfig.global.paramsSchema,
      envConfig.stage.paramsSchema,
    );
    const envSchema = buildEnvSchema(
      globalPick,
      stagePick,
      envConfig.global.paramsSchema,
      envConfig.stage.paramsSchema,
    );
    const env = parseTypedEnv(
      envSchema,
      process.env as Record<string, unknown>,
    );
    const logger = console;

    // Non-HTTP: call business directly
    const httpTokens =
      opts?.httpEventTypeTokens ??
      (defaultHttpEventTypeTokens as readonly string[]);
    const isHttp = httpTokens.includes(
      functionConfig.eventType as unknown as string,
    );
    if (!isHttp) {
      return business(
        event as ShapedEvent<EventSchema, EventTypeMap[EventType]>,
        context,
        { env, logger },
      );
    }
    // HTTP: build middleware stack
    const fnHttp = (functionConfig as { http?: unknown }).http;
    const maybeContentType = (functionConfig as { contentType?: string })
      .contentType;
    const args: {
      functionName: string;
      logger: Console;
      eventSchema?: z.ZodType;
      responseSchema?: z.ZodType;
      contentType?: string;
      app?: AppHttpConfig;
      fn?: FunctionHttpConfig;
    } = {
      functionName: functionConfig.functionName,
      logger,
      ...(functionConfig.eventSchema
        ? { eventSchema: functionConfig.eventSchema }
        : {}),
      ...(functionConfig.responseSchema
        ? { responseSchema: functionConfig.responseSchema }
        : {}),
      ...(typeof maybeContentType === 'string' && maybeContentType.length > 0
        ? { contentType: maybeContentType }
        : {}),
      ...(opts?.httpConfig ? { app: opts.httpConfig } : {}),
      ...(fnHttp ? { fn: fnHttp as FunctionHttpConfig } : {}),
    };
    const http = computeHttpMiddleware(args);

    const wrapped = middy(async (e: unknown, c: Context) =>
      business(e as ShapedEvent<EventSchema, EventTypeMap[EventType]>, c, {
        env,
        logger,
      }),
    ).use(http);

    return wrapped(event as never, context);
  };
}
