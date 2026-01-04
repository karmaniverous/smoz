/**
 * Stage artifacts factory.
 *
 * Validates per‑stage configurations, composes them with global params,
 * and produces:
 *  - Serverless `stages` (params), *  - provider‑level `environment` mapping,
 *  - a helper to build per‑function env mappings (excluding globally exposed keys).
 */
import { diff, unique } from 'radash';
import type { ZodObject, ZodRawShape } from 'zod';
/** Dictionary type alias. */
export type Dict<T> = Record<string, T>;

/** Input for stages factory. */
export type StagesFactoryInput<
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
> = {
  /** Global parameters schema. */
  globalParamsSchema: ZodObject<ZodRawShape>;
  /** Stage parameters schema. */
  stageParamsSchema: ZodObject<ZodRawShape>;
  /** Global parameters values. */
  globalParams: GlobalParams;
  /** Global environment keys. */
  globalEnvKeys: readonly (keyof GlobalParams)[];
  /** Stage environment keys. */
  stageEnvKeys: readonly (keyof StageParams)[];
  /** Map of stage names to stage parameters. */
  stages: Dict<StageParams>;
};

/** Output from stages factory. */
export type StagesFactoryOutput<
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
> = {
  /** Serverless 'params' object: { default: { params: GlobalParams }, <stage>: { params: StageParams } } */
  stages: { default: { params: GlobalParams } } & {
    [K in keyof Dict<StageParams>]: { params: StageParams };
  };
  /** Provider-level environment mapping for globally exposed keys */
  environment: Record<string, string>;
  /** Helper to build per-function environment mapping for additional keys */
  buildFnEnv: (
    fnEnvKeys?: readonly (keyof (GlobalParams & StageParams))[],
  ) => Record<string, string>;
};

/**
 * Create all stage artifacts from provided configs.  This is generic and can
 * be used by both production and tests.
 *
 * @typeParam GlobalParams - global params record
 * @typeParam StageParams  - stage params record
 * @param input - schemas, concrete params, env exposure, and per‑stage values
 * @returns stage params object, provider environment, and per‑function env builder
 *
 * @throws Error if a stage fails validation or a required global key is missing
 */
export const stagesFactory = <
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
>(
  input: StagesFactoryInput<GlobalParams, StageParams>,
): StagesFactoryOutput<GlobalParams, StageParams> => {
  const {
    globalParamsSchema,
    stageParamsSchema,
    globalParams,
    globalEnvKeys,
    stageEnvKeys,
    stages,
  } = input;

  // Validate each stage configuration:
  // 1) Stage object conforms to stage schema
  // 2) Stage merged with global satisfies required global keys
  const entries = Object.entries(stages);
  for (const [, stage] of entries) {
    stageParamsSchema.parse(stage);
    globalParamsSchema.strip().parse({ ...globalParams, ...stage });
  }

  // Build Serverless 'params' structure
  const stagesOut = entries.reduce(
    (acc, [name, params]) => {
      acc[name] = { params } as { params: StageParams };
      return acc;
    },
    { default: { params: globalParams } } as {
      default: { params: GlobalParams };
    } & {
      [K in keyof Dict<StageParams>]: { params: StageParams };
    },
  );

  // Build provider.environment mapping for globally exposed keys
  const globallyExposed = unique(
    ([] as readonly string[]).concat(
      globalEnvKeys as readonly string[],
      stageEnvKeys as readonly string[],
    ),
  );
  const environment = Object.fromEntries(
    globallyExposed.map((k) => [k, `\${param:${k}}`]),
  );
  // Helper for function-level environment: include only non-globally-exposed
  const buildFnEnv = (
    fnEnvKeys: readonly (keyof (GlobalParams & StageParams))[] | undefined = [],
  ): Record<string, string> => {
    const extras = diff(fnEnvKeys as readonly string[], globallyExposed);
    return Object.fromEntries(extras.map((k) => [k, `\${param:${k}}`]));
  };

  return { stages: stagesOut, environment, buildFnEnv };
};
