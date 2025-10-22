import { buildSpawnEnv as upstreamBuildSpawnEnv } from '@karmaniverous/get-dotenv';

/**
 * Spawn env builder (host-provided).
 * Delegates to @karmaniverous/get-dotenv.buildSpawnEnv.
 *
 * @param base - base environment (overrides take precedence over process.env)
 * @param overrides - reserved for future ctx-based overrides (optional)
 */
export const buildSpawnEnvMaybe = async (
  base: NodeJS.ProcessEnv,
  overrides?: Record<string, unknown>,
): Promise<NodeJS.ProcessEnv> => {
  return upstreamBuildSpawnEnv(
    base as Record<string, string | undefined>,
    overrides,
  );
};
