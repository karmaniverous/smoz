/**
 * REQUIREMENTS ADDRESSED
 * - Derive an environment schema from Global & Stage Zod schemas and an allowlist of keys.
 * - Provide utilities to merge env key sets and to parse process.env into a typed object.
 * - No dynamic imports; no defaults for generic parameters.
 */
import type { ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';

/** Union all env keys we plan to expose into a single set. */
/**
 * Derive the union of env keys we plan to expose.
 *
 * @param globalEnv - keys exposed from global params schema
 * @param stageEnv  - keys exposed from stage params schema
 * @param fnEnv     - optional per‑function extra keys
 */
export const deriveAllKeys = (
  globalEnv: readonly PropertyKey[],
  stageEnv: readonly PropertyKey[],
  fnEnv: readonly PropertyKey[] = [],
): ReadonlySet<PropertyKey> => {
  const out = new Set<PropertyKey>();
  globalEnv.forEach((k) => out.add(k));
  stageEnv.forEach((k) => out.add(k));
  fnEnv.forEach((k) => out.add(k));
  return out;
};

/** Split the unioned keys by which Zod schema defines them. */
/**
 * Partition a union of env keys by which schema defines each key.
 *
 * @typeParam G - global params Zod object schema
 * @typeParam S - stage params Zod object schema
 * @param allKeys - union set from {@link deriveAllKeys}
 * @param globalParamsSchema - global schema
 * @param stageParamsSchema  - stage schema
 * @returns lists of keys to pick from each schema
 */
export const splitKeysBySchema = <
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
>(
  allKeys: ReadonlySet<PropertyKey>,
  globalParamsSchema: G,
  stageParamsSchema: S,
): {
  /** Keys belonging to the global schema. */
  globalPick: readonly (keyof z.infer<G>)[];
  /** Keys belonging to the stage schema (and not global). */
  stagePick: readonly (keyof z.infer<S>)[];
} => {
  const gKeySet = new Set(Object.keys(globalParamsSchema.shape));
  const sKeySet = new Set(Object.keys(stageParamsSchema.shape));
  const globalPick = [...allKeys].filter((k): k is keyof z.infer<G> =>
    gKeySet.has(String(k)),
  );

  const stagePick = [...allKeys].filter((k): k is keyof z.infer<S> => {
    const key = String(k);
    return sKeySet.has(key) && !gKeySet.has(key);
  });

  return { globalPick, stagePick };
};

/** Build a Zod schema that picks only the requested keys from both schemas. */
/**
 * Build a composed Zod schema to parse process.env, selecting keys from global+stage schemas.
 *
 * @typeParam G - global params Zod schema
 * @typeParam S - stage params Zod schema
 * @param globalPick - keys to select from global schema
 * @param stagePick  - keys to select from stage schema
 * @param globalParamsSchema - global params schema
 * @param stageParamsSchema  - stage params schema
 * @returns Zod object schema accepting the union of selected keys
 */
export const buildEnvSchema = <
  G extends ZodObject<ZodRawShape>,
  S extends ZodObject<ZodRawShape>,
>(
  globalPick: readonly (keyof z.infer<G>)[],
  stagePick: readonly (keyof z.infer<S>)[],
  globalParamsSchema: G,
  stageParamsSchema: S,
) => {
  const toPick = (keys: readonly string[]) =>
    Object.fromEntries(keys.map((k) => [k, true])) as Record<string, true>;

  const gPicked = globalParamsSchema.pick(
    toPick(globalPick as readonly string[]),
  );
  const sPicked = stageParamsSchema.pick(
    toPick(stagePick as readonly string[]),
  );

  return z.object({}).extend(gPicked.shape).extend(sPicked.shape);
};

/** Parse an arbitrary source (e.g., process.env) with a provided env schema. */
/**
 * Parse an arbitrary env source (e.g., process.env) with a provided schema.
 *
 * @param envSchema - Zod schema from {@link buildEnvSchema}
 * @param envSource - map of environment variables
 */
export const parseTypedEnv = <T extends z.ZodType>(
  envSchema: T,
  envSource: Record<string, unknown>,
): z.infer<T> => envSchema.parse(envSource);

/** HTTP helper used by tests and middleware. */
/**
 * Detect a HEAD method (case‑insensitive).
 * @param method - HTTP method string
 */
export const isHead = (method?: string): boolean =>
  typeof method === 'string' && method.toUpperCase() === 'HEAD';
