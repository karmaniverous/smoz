import type { z } from 'zod';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import type { EnvAttached } from '@/src/core/defineFunctionConfig';
import type { ZodObj } from '@/src/core/types';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import { wrapHandler } from '@/src/runtime/wrapHandler';
import type { FunctionConfig } from '@/src/types/FunctionConfig';
import type { Handler } from '@/src/types/Handler';

/**
+ handlerFactory
 * - Produces a function that builds a wrapped handler with runtime HTTP tokens.
 * - Fully typed; no any; no dynamic import() types.
 *
 * @param httpEventTypeTokens - runtime widening of HTTP event tokens
 * @param httpConfig - application-level HTTP configuration
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
  /**
   * Create a Lambda handler from a function configuration and business logic.
   *
   * @param functionConfig - The branded function configuration.
   * @param business - The business logic handler.
   */
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
  ) =>
    wrapHandler(functionConfig, business, {
      httpEventTypeTokens,
      httpConfig,
    });
};
