/**
 * App (schema‑first)
 *
 * Overloads on create() preserve strong inference when eventTypeMapSchema is omitted.
 * Central orchestrator for a SMOZ application. You provide:
 * - Global/stage parameter schemas and env exposure keys
 * - Serverless defaults (handler filename/export and context map) * - Event‑type map schema (extendable: e.g., add 'step')
 *
 * The instance:
 * - Validates configuration
 * - Exposes env and stage artifacts for Serverless (provider.environment and params)
 * - Provides a registry to define functions (HTTP and non‑HTTP)
 * - Aggregates artifacts:
 *   - buildAllServerlessFunctions(): AWS['functions']
 *   - buildAllOpenApiPaths(): ZodOpenApiPathsObject
 *
 * @remarks See README for a full quick‑start, and typedoc for detailed API docs.
 */
import type { AWS } from '@serverless/typescript';
import type { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import type { AppInit, ParamsKey } from '@/src/core/AppInit';
import { baseEventTypeMapSchema } from '@/src/core/baseEventTypeMapSchema';
import { buildStageArtifacts } from '@/src/core/buildStageArtifacts';
import type { EnvSchemaNode } from '@/src/core/defineAppConfig';
import type { DefineFunctionOptions } from '@/src/core/functionOptions';
import {
  defaultHttpEventTypeTokens,
  validateEventTypeMapSchemaIncludesBase,
} from '@/src/core/httpTokens';
import { createRegistry } from '@/src/core/registry';
import {
  type AppServerlessConfig,
  serverlessConfigSchema,
} from '@/src/core/serverlessConfig';
import type { ZodObj } from '@/src/core/types';
import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import { buildAllOpenApiPaths as buildPaths } from '@/src/openapi/buildOpenApi';
import { buildAllServerlessFunctions as buildFns } from '@/src/serverless/buildServerless';
import type { FunctionEnv } from '@/src/types/FunctionEnv';

/** The default event type map schema. */
type BaseMap = typeof baseEventTypeMapSchema;

/**
 * Application class. *
 * @typeParam GlobalParamsSchema - Zod object schema for global parameters
 * @typeParam StageParamsSchema  - Zod object schema for per‑stage parameters
 * @typeParam EventTypeMapSchema - Zod object schema mapping event tokens to runtime types
 * @typeParam GlobalEnvKey - the app's global `envKeys` (every function's env)
 * @typeParam StageEnvKey - the app's stage `envKeys` (every function's env)
 * @typeParam DefaultFnEnvKey - `functionDefaults.fnEnvKeys` (every function's env)
 */ export class App<
  GlobalParamsSchema extends ZodObj,
  StageParamsSchema extends ZodObj,
  EventTypeMapSchema extends ZodObj,
  GlobalEnvKey extends keyof z.infer<GlobalParamsSchema> = never,
  StageEnvKey extends keyof z.infer<StageParamsSchema> = never,
  DefaultFnEnvKey extends ParamsKey<GlobalParamsSchema, StageParamsSchema> =
    never,
> {
  /** Helper alias for stage artifacts type */
  private static readonly _stageArtifactsType = null as unknown as ReturnType<
    typeof buildStageArtifacts
  >;
  public readonly appRootAbs: string;
  // Schemas
  public readonly globalParamsSchema: GlobalParamsSchema;
  public readonly stageParamsSchema: StageParamsSchema;
  public readonly eventTypeMapSchema: EventTypeMapSchema; // Serverless config
  public readonly serverless: AppServerlessConfig;

  // Env exposure
  public readonly global: EnvSchemaNode<GlobalParamsSchema>;
  public readonly stage: EnvSchemaNode<StageParamsSchema>;

  // Derived stage artifacts
  public readonly stages: ReturnType<typeof buildStageArtifacts>['stages'];
  public readonly environment: ReturnType<
    typeof buildStageArtifacts
  >['environment'];
  public readonly buildFnEnv: ReturnType<
    typeof buildStageArtifacts
  >['buildFnEnv'];

  public readonly http: AppHttpConfig;
  // HTTP tokens for runtime decision
  public readonly httpEventTypeTokens: readonly string[];
  // Registry (delegated to src/app/registry)
  private readonly registry: ReturnType<
    typeof createRegistry<
      GlobalParamsSchema,
      StageParamsSchema,
      EventTypeMapSchema
    >
  >;

  private constructor(
    init: AppInit<
      GlobalParamsSchema,
      StageParamsSchema,
      EventTypeMapSchema,
      GlobalEnvKey,
      StageEnvKey,
      DefaultFnEnvKey
    >,
  ) {
    this.appRootAbs = init.appRootAbs.replace(/\\/g, '/');
    this.globalParamsSchema = init.globalParamsSchema;
    this.stageParamsSchema = init.stageParamsSchema;
    // Default to base schema when omitted (apply default INSIDE the function)
    this.eventTypeMapSchema = (init.eventTypeMapSchema ??
      baseEventTypeMapSchema) as EventTypeMapSchema;
    // Parse serverless input internally
    this.serverless = serverlessConfigSchema.parse(init.serverless);

    // Validate that eventTypeMapSchema includes base keys at runtime
    validateEventTypeMapSchemaIncludesBase(
      (this.eventTypeMapSchema as ZodObj).shape,
    );

    // Env exposure nodes
    this.global = {
      paramsSchema: this.globalParamsSchema,
      envKeys: init.global.envKeys,
    };
    this.stage = {
      paramsSchema: this.stageParamsSchema,
      envKeys: init.stage.envKeys,
    };

    // Build stages/environment/fn-env via helper (applies “stage extends global” and parsing)
    const { stages, environment, buildFnEnv } = buildStageArtifacts(
      this.globalParamsSchema,
      this.stageParamsSchema,
      { params: init.global.params, envKeys: init.global.envKeys },
      { params: init.stage.params, envKeys: init.stage.envKeys },
    );
    this.stages = stages;
    this.environment = environment;
    this.buildFnEnv = buildFnEnv;

    // HTTP tokens (runtime decision)
    this.httpEventTypeTokens = (init.httpEventTypeTokens ??
      defaultHttpEventTypeTokens) as readonly string[];
    // App-level HTTP customization
    this.http = init.http ?? {};
    // Initialize function registry
    this.registry = createRegistry<
      GlobalParamsSchema,
      StageParamsSchema,
      EventTypeMapSchema
    >({
      appRootAbs: this.appRootAbs,
      eventTypeKeys: Object.keys(this.eventTypeMapSchema.shape),
      httpEventTypeTokens: this.httpEventTypeTokens,
      env: { global: this.global, stage: this.stage },
      http: this.http,
      // With exactOptionalPropertyTypes, do not pass an explicit undefined.
      ...(init.functionDefaults
        ? { functionDefaults: init.functionDefaults }
        : {}),
    });
  } /**
   * Ergonomic constructor for schema‑first inference.
   *
   * @param init - initialization object (schemas, serverless defaults, params/envKeys)
   * @returns a new App instance
   */
  // Env keys are inferred as literal unions (no `as const` needed); absent
  // ones default to never, so `options.env` holds exactly the declared keys.
  // G, S, E, GK, SK, DK: the class's type parameters, in order.
  // Overload 1: eventTypeMapSchema provided → infer from provided schema (typed)
  static create<
    G extends ZodObj,
    S extends ZodObj,
    E extends ZodObj,
    GK extends keyof z.infer<G> = never,
    SK extends keyof z.infer<S> = never,
    DK extends ParamsKey<G, S> = never,
  >(init: AppInit<G, S, E, GK, SK, DK>): App<G, S, E, GK, SK, DK>;
  // Overload 2: eventTypeMapSchema omitted → default to baseEventTypeMapSchema (typed)
  static create<
    G extends ZodObj,
    S extends ZodObj,
    GK extends keyof z.infer<G> = never,
    SK extends keyof z.infer<S> = never,
    DK extends ParamsKey<G, S> = never,
  >(
    init: Omit<AppInit<G, S, BaseMap, GK, SK, DK>, 'eventTypeMapSchema'> & {
      eventTypeMapSchema?: undefined;
    },
  ): App<G, S, BaseMap, GK, SK, DK>;
  // Implementation (must come after overload signatures)
  static create<
    G extends ZodObj,
    S extends ZodObj,
    E extends ZodObj,
    GK extends keyof z.infer<G>,
    SK extends keyof z.infer<S>,
    DK extends ParamsKey<G, S>,
  >(init: AppInit<G, S, E, GK, SK, DK>): App<G, S, E, GK, SK, DK> {
    return new App(init);
  }
  /**
   * Register a function (HTTP or non‑HTTP).
   *
   * Only `callerModuleUrl` is required. `eventType`, `endpointsRootAbs`,
   * `functionName`, `method` and `basePath` derive from the file's location
   * under `<appRootAbs>/functions/<eventType>/`; `httpContexts`,
   * `contentType`, `http`, `serverless`, `fnEnvKeys` and the name style come
   * from the app's `functionDefaults`. Explicit values always win. See
   * {@link DefineFunctionOptions} for each field's default. Derivation gives
   * the same result inside a deployed bundle, where `appRootAbs` points
   * inside the bundle's folder: the root then comes from the caller's last
   * `functions/<eventType>/` folder.
   *
   * @typeParam EventType      - A key from your eventTypeMapSchema (e.g., 'rest' | 'http' | 'sqs' | 'step'). Inferred as a literal when `eventType` is passed; when omitted it widens to all keys of the map (the runtime value is still derived from the path), so pass `eventType` when the handler needs the narrowed event type.
   * @typeParam EventSchema    - Optional Zod schema validated BEFORE the handler (refines event shape)
   * @typeParam ResponseSchema - Optional Zod schema validated AFTER the handler (refines response shape)
   * @typeParam FnEnvKey       - This function's `fnEnvKeys` (inferred as literals); with the app's env keys they type `options.env`
   * @param options - per‑function configuration
   * @returns a per‑function API: { handler(business), openapi(baseOperation), serverless(extras) }
   * @throws Error when `eventType` is omitted and the caller isn't under `<appRootAbs>/functions/<eventType>/` for a key of eventTypeMapSchema, or it is an HTTP token and the method or base path can't be derived; when `functionName` duplicates another function's; or when an HTTP function selects (or `functionDefaults.http` selects) a profile that isn't in `http.profiles`
   */
  public defineFunction<
    EventType extends Extract<keyof z.infer<EventTypeMapSchema>, string>,
    EventSchema extends z.ZodType | undefined,
    ResponseSchema extends z.ZodType | undefined,
    FnEnvKey extends ParamsKey<GlobalParamsSchema, StageParamsSchema> = never,
  >(
    options: DefineFunctionOptions<
      EventType,
      EventSchema,
      ResponseSchema,
      FnEnvKey
    >,
  ) {
    return this.registry.defineFunction<
      EventType,
      EventSchema,
      ResponseSchema,
      FunctionEnv<
        z.infer<GlobalParamsSchema>,
        z.infer<StageParamsSchema>,
        GlobalEnvKey | StageEnvKey | DefaultFnEnvKey | FnEnvKey
      >
    >(options);
  }

  /**
   * Aggregate Serverless function definitions across the registry.
   *
   * @returns An AWS['functions'] object suitable for serverless.ts
   */
  buildAllServerlessFunctions(): AWS['functions'] {
    return buildFns(this.registry.values(), this.serverless, this.buildFnEnv);
  }

  /**
   * Aggregate OpenAPI path items across the registry.
   *
   * @returns ZodOpenApiPathsObject to be embedded in a full OpenAPI document
   */
  buildAllOpenApiPaths(): ZodOpenApiPathsObject {
    return buildPaths(this.registry.values());
  }
}
