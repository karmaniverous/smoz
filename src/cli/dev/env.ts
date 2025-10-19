import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const inferDefaultStage = (root: string, verbose: boolean): string => {
  void root;
  // Prefer “dev”; explicit --stage overrides remain available.
  if (verbose)
    console.log('[dev] inferring stage: dev (explicit --stage overrides)');
  return 'dev';
};

/**
 * Resolve the effective stage for dev according to precedence:
 * 1) CLI --stage
 * 2) getdotenv.config.json -> plugins.smoz.stage (string)
 * 3) process.env.STAGE
 * 4) inferDefaultStage() fallback ("dev")
 *
 * Notes:
 * - We intentionally read only the JSON variant to avoid adding YAML/TS loaders
 *   to the CLI runtime. JS/TS config will be handled by the get-dotenv host
 *   once the full plugin-first path is wired; this probe is a safe, minimal
 *   bridge that preserves current behavior when the file is absent.
 */
export const resolveStage = async (
  root: string,
  cliStage: string | undefined,
  verbose: boolean,
): Promise<string> => {
  if (typeof cliStage === 'string' && cliStage.trim().length > 0) {
    if (verbose) console.log(`[dev] stage (cli): ${cliStage}`);
    return cliStage;
  }

  // getdotenv.config.json → plugins.smoz.stage
  try {
    const cfgPath = path.resolve(root, 'getdotenv.config.json');
    if (existsSync(cfgPath)) {
      const raw = readFileSync(cfgPath, 'utf8');
      const parsed = JSON.parse(raw) as {
        plugins?: { smoz?: { stage?: unknown } };
      };
      const fromCfg = parsed.plugins?.smoz?.stage;
      if (typeof fromCfg === 'string' && fromCfg.trim().length > 0) {
        if (verbose) console.log(`[dev] stage (config): ${fromCfg}`);
        return fromCfg.trim();
      }
    }
  } catch {
    // best-effort; fall through
  }

  const envStage =
    typeof process.env.STAGE === 'string' ? process.env.STAGE : undefined;
  if (envStage && envStage.trim().length > 0) {
    if (verbose) console.log(`[dev] stage (env): ${envStage}`);
    return envStage.trim();
  }

  return inferDefaultStage(root, verbose);
};

export const seedEnvForStage = async (
  root: string,
  stage: string,
  verbose: boolean,
): Promise<void> => {
  // Best effort: import the app config to read declared env keys and concrete values.
  // Preserve existing process.env values; only seed when unset.
  try {
    const appConfigUrl = pathToFileURL(
      path.resolve(root, 'app', 'config', 'app.config.ts'),
    ).href;
    // Dynamically import the TS module under tsx
    const mod = (await import(appConfigUrl)) as Record<string, unknown>;
    const app = mod.app as
      | {
          global?: { envKeys?: readonly string[] };
          stage?: { envKeys?: readonly string[] };
        }
      | undefined;
    const stages = mod.stages as
      | {
          default?: { params?: Record<string, unknown> };
          [k: string]: unknown;
        }
      | undefined;
    const globalKeys: readonly unknown[] = Array.isArray(app?.global?.envKeys)
      ? app.global.envKeys
      : [];
    const stageKeys: readonly unknown[] = Array.isArray(app?.stage?.envKeys)
      ? app.stage.envKeys
      : [];
    const globalParams =
      (stages?.default as { params?: Record<string, unknown> }).params ?? {};
    const stageParams =
      (stages?.[stage] as { params?: Record<string, unknown> }).params ?? {};

    const seedPair = (key: string, from: Record<string, unknown>) => {
      if (key in process.env) return;
      const val = from[key];
      if (val === undefined) return;
      if (typeof val === 'string') {
        process.env[key] = val;
        if (verbose) console.log(`[dev] env: ${key}=${val}`);
        return;
      }
      if (typeof val === 'number' || typeof val === 'boolean') {
        const v = String(val);
        process.env[key] = v;
        if (verbose) console.log(`[dev] env: ${key}=${v}`);
        return;
      }
      // Non-primitive; skip to avoid [object Object] surprise.
      if (verbose) console.log(`[dev] env: skip ${key} (non-primitive)`);
    };

    for (const k of globalKeys) {
      if (typeof k === 'string') {
        seedPair(k, globalParams);
      }
    }
    for (const k of stageKeys) {
      if (typeof k === 'string') {
        seedPair(k, stageParams);
      }
    }
    // Ensure STAGE itself is present as a last resort
    if (!process.env.STAGE) {
      process.env.STAGE = stage;
      if (verbose) console.log(`[dev] env: STAGE=${stage}`);
    }
  } catch {
    // Fallback: seed STAGE only
    if (!process.env.STAGE) {
      process.env.STAGE = stage;
      if (verbose) console.log(`[dev] env: STAGE=${stage}`);
    }
  }
};
