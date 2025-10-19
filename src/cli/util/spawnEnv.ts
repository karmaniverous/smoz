import os from 'node:os';

/**
 * Best-effort spawn env builder:
 * - Prefer @karmaniverous/get-dotenv.buildSpawnEnv when present.
 * - Fallback to a normalized copy of process.env with sane TMP/HOME defaults.
 *
 * @param base - base environment (overrides take precedence over process.env)
 * @param overrides - reserved for future ctx-based overrides (optional)
 */
export const buildSpawnEnvMaybe = async (
  base: NodeJS.ProcessEnv,
  overrides?: Record<string, unknown>,
): Promise<NodeJS.ProcessEnv> => {
  void overrides; // reserved; ctx plumbing will supply these in a later change
  try {
    // Dynamic import to avoid hard dependency on symbols during the transition.
    const mod = (await import('@karmaniverous/get-dotenv')) as {
      buildSpawnEnv?: (
        b: Record<string, string | undefined>,
        o?: Record<string, unknown>,
      ) => NodeJS.ProcessEnv;
    };
    if (typeof mod.buildSpawnEnv === 'function') {
      return mod.buildSpawnEnv(base as Record<string, string | undefined>);
    }
  } catch {
    // ignore; fallback below
  }

  // Fallback: merge with process.env and normalize temp/home semantics
  const tmp = os.tmpdir();
  const out: NodeJS.ProcessEnv = { ...process.env, ...base };

  // Cross-platform temp defaults
  if (!out.TMPDIR) out.TMPDIR = tmp;
  if (process.platform === 'win32') {
    if (!out.TEMP) out.TEMP = tmp;
    if (!out.TMP) out.TMP = tmp;
    if (!out.LOCALAPPDATA) out.LOCALAPPDATA = tmp;
    if (!out.USERPROFILE) out.USERPROFILE = out.USERPROFILE ?? tmp;
  } else {
    if (!out.HOME) out.HOME = out.HOME ?? tmp;
  }

  return out;
};
