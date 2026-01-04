import type { z } from 'zod';
import { type ZodObject, type ZodRawShape } from 'zod';

import { stagesFactory } from '@/src/serverless/stagesFactory';
import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

/** Base: envKeys tied to a Zod schema’s inferred keys. */
/**
 * Bind a list of environment keys to a schema’s inferred key space.
 *
 * @typeParam Schema - Zod object schema
 * @remarks Used to express “these keys are allowed to be exposed from this schema”.
 */
export interface EnvKeysNode<Schema extends ZodObject<ZodRawShape>> {
  /** List of keys to expose from the schema to the environment. */
  envKeys: readonly (keyof z.infer<Schema>)[];
}
/** For wrapper input: schema + envKeys. */
export interface EnvSchemaNode<
  Schema extends ZodObject<ZodRawShape>,
> extends EnvKeysNode<Schema> {
  /** Zod schema for the parameters. */
  paramsSchema: Schema;
}
/** Wrapper input: no glue; both global and stage sides. */
/**
 * Environment configuration bounds for an application.
 *
 * @typeParam GlobalParamsSchema - Global params schema
 * @typeParam StageParamsSchema  - Per‑stage params schema
 */
export interface GlobalEnvConfig<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
> {
  /** Global environment configuration. */
  global: EnvSchemaNode<GlobalParamsSchema>;
  /** Stage environment configuration. */
  stage: EnvSchemaNode<StageParamsSchema>;
}

/** Authoring input — global: concrete params + envKeys. */
/**
 * Concrete global configuration for authoring (params + env exposure).
 *
 * @typeParam GlobalParamsSchema - Global params schema
 * @remarks The App keeps this typed and uses it to generate provider.environment.
 */
export interface GlobalParamsNode<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
> extends EnvKeysNode<GlobalParamsSchema> {
  /** Concrete global parameter values. */
  params: z.infer<GlobalParamsSchema>;
}

/** Authoring input — stage: per-stage params + envKeys. */
/**
 * Concrete per‑stage configuration for authoring (params + env exposure).
 *
 * @typeParam StageParamsSchema - Per‑stage params schema
 * @remarks The App composes stage with global (global.partial().extend(stage)).
 */
export interface StageParamsNode<
  StageParamsSchema extends ZodObject<ZodRawShape>,
> extends EnvKeysNode<StageParamsSchema> {
  /** Concrete parameter values keyed by stage name. */
  params: Record<string, z.infer<StageParamsSchema>>;
}

/** Authoring input for unified app config (serverless + env). */
/**
 * Authoring input for a complete, unified app configuration.
 *
 * @typeParam GlobalParamsSchema - Global params schema
 * @typeParam StageParamsSchema  - Per‑stage params schema
 * @remarks Use with {@link defineAppConfig}.
 */
export interface DefineAppConfigInput<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
> {
  /** Serverless configuration defaults. */
  serverless: {
    /** Default handler file name (e.g., 'handler.ts'). */
    defaultHandlerFileName: string;
    /** Default handler export name (e.g., 'handler'). */
    defaultHandlerFileExport: string;
    /** Map of security contexts to event fragments. */
    httpContextEventMap: SecurityContextHttpEventMap;
  };
  /** Global parameters and environment exposure. */
  global: GlobalParamsNode<GlobalParamsSchema>;
  /** Stage parameters and environment exposure. */
  stage: StageParamsNode<StageParamsSchema>;
}

/**
 * Output of {@link defineAppConfig}.
 *
 * Carries serverless defaults, stage artifacts, and typed env nodes suitable
 * for passing directly to SMOZ wrappers.
 */
export interface DefineAppConfigOutput<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
> extends GlobalEnvConfig<GlobalParamsSchema, StageParamsSchema> {
  /** Serverless configuration defaults. */
  serverless: DefineAppConfigInput<
    GlobalParamsSchema,
    StageParamsSchema
  >['serverless'];
  /** Generated Serverless stage configurations. */
  stages: ReturnType<typeof stagesFactory>['stages'];
  /** Generated Serverless provider environment variables. */
  environment: ReturnType<typeof stagesFactory>['environment'];
  /** Helper to build per-function environment variables. */
  buildFnEnv: ReturnType<typeof stagesFactory>['buildFnEnv'];
}

/**
 * Define a complete application configuration from schemas and authoring input.
 *
 * @typeParam GlobalParamsSchema - Global params schema
 * @typeParam StageParamsSchema  - Per‑stage params schema
 * @param globalParamsSchema - schema for global params
 * @param stageParamsSchema  - schema for stage params
 * @param input - serverless defaults and concrete params + env exposure
 * @returns Typed configuration nodes and stage artifacts
 * * @throws Error if envKeys include keys not present in their corresponding schema
 */
export function defineAppConfig<
  GlobalParamsSchema extends ZodObject<ZodRawShape>,
  StageParamsSchema extends ZodObject<ZodRawShape>,
>(
  globalParamsSchema: GlobalParamsSchema,
  stageParamsSchema: StageParamsSchema,
  input: DefineAppConfigInput<GlobalParamsSchema, StageParamsSchema>,
): DefineAppConfigOutput<GlobalParamsSchema, StageParamsSchema> {
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
  assertKeysSubset(
    globalParamsSchema,
    input.global.envKeys as readonly string[],
    'global.envKeys',
  );
  assertKeysSubset(
    stageParamsSchema,
    input.stage.envKeys as readonly string[],
    'stage.envKeys',
  );

  const sf = stagesFactory({
    globalParamsSchema,
    stageParamsSchema,
    globalParams: input.global.params,
    globalEnvKeys: input.global.envKeys,
    stageEnvKeys: input.stage.envKeys,
    stages: input.stage.params,
  });

  return {
    serverless: input.serverless,
    global: { paramsSchema: globalParamsSchema, envKeys: input.global.envKeys },
    stage: { paramsSchema: stageParamsSchema, envKeys: input.stage.envKeys },
    stages: sf.stages,
    environment: sf.environment,
    buildFnEnv: sf.buildFnEnv,
  };
}
