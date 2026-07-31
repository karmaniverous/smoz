import type { z } from 'zod';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import type { EnvAttached } from '@/src/core/defineFunctionConfig';
import type { ZodObj } from '@/src/core/types';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler } from '@/src/types/Handler';

/**
 * handlerFactory
 * - Produces a function that builds a wrapped handler with runtime HTTP tokens.
 * - Fully typed; no any; no dynamic import() types.
 *
 * @param httpEventTypeTokens - runtime widening of HTTP event tokens
 * @returns a function that binds a branded FunctionConfig and a business handler, producing a Lambda handler
 */
export const handlerFactory = <
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapResolved extends BaseEventTypeMap,
  EventType extends keyof EventTypeMapResolved,
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
>(
  httpEventTypeTokens: readonly string[],
  httpConfig: AppHttpConfig,
) => {
  return (
    functionConfig: FunctionConfig<
      EventSchema,
      ResponseSchema,
      z.infer<GlobalParamsSchema>,
      z.infer<StageParamsSchema>,
      EventTypeMapResolved,
      EventType
    > &
      EnvAttached<GlobalParamsSchema, StageParamsSchema>,
    business: Handler<
      EventSchema,
      ResponseSchema,
      EventTypeMapResolved[EventType]
    >,
  ) => {
    // Lazy-load wrapHandler to avoid pulling @middy/core into the static
    // import graph. Serverless Framework's config-time esbuild would otherwise
    // choke on middy's ESM-only exports map.
    let cached:
      ((event: unknown, context: unknown) => Promise<unknown>) | undefined;

    return async (event: unknown, context: unknown) => {
      if (!cached) {
        const { wrapHandler } = await import('@/src/runtime/wrapHandler');
        cached = wrapHandler(functionConfig, business, {
          httpEventTypeTokens,
          httpConfig,
        }) as (event: unknown, context: unknown) => Promise<unknown>;
      }
      return cached(event, context);
    };
  };
};
