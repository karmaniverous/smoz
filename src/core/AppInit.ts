/**
 * AppInit: the configuration object passed to `App.create` (params schemas,
 * env keys, Serverless defaults, event type map, HTTP and function defaults).
 *
 * @packageDocumentation
 */
import type { z } from 'zod';

import type { FunctionDefaults } from '@/src/core/functionOptions';
import type { serverlessConfigSchema } from '@/src/core/serverlessConfig';
import type { ZodObj } from '@/src/core/types';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';

/**
 * Configuration for `App.create`.
 *
 * @typeParam GlobalParamsSchema - Zod object schema for global parameters
 * @typeParam StageParamsSchema - Zod object schema for per-stage parameters
 * @typeParam EventTypeMapSchema - Zod object schema mapping event tokens to runtime types
 */
export interface AppInit<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
> {
  appRootAbs: string;
  globalParamsSchema: GlobalParamsSchema;
  stageParamsSchema: StageParamsSchema;
  eventTypeMapSchema?: EventTypeMapSchema;
  /** Accept raw serverless config; App will parse it internally. */
  serverless: z.input<typeof serverlessConfigSchema>;
  global: {
    params: z.infer<GlobalParamsSchema>;
    envKeys: readonly (keyof z.infer<GlobalParamsSchema>)[];
  };
  stage: {
    /** Accept raw stage param objects; App will parse with (global.partial + stage) */
    params: Record<string, Record<string, unknown>>;
    envKeys: readonly (keyof z.infer<StageParamsSchema>)[];
  };
  /**
   * HTTP tokens to treat as HTTP at runtime (widenable).
   * Defaults to ['rest', 'http'].
   */
  httpEventTypeTokens?: readonly (keyof z.infer<EventTypeMapSchema>)[];
  /**
   * Optional app-level HTTP middleware customization (defaults & profiles).
   */
  http?: AppHttpConfig;
  /**
   * Optional defaults applied to every function registered with
   * `defineFunction` (env keys, HTTP contexts, content type, per-function
   * HTTP customization, Serverless properties, name style). Explicit
   * per-function values win.
   */
  functionDefaults?: FunctionDefaults;
}
