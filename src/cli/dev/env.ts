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
 * 2) process.env.STAGE
 * 3) first non-"default" stage key from app.stages
 * 4) inferDefaultStage() fallback ("dev")
 *
 * Notes:
 * - SMOZ must not parse get-dotenv config files directly. Any get-dotenv config
 *   defaults should flow through the get-dotenv host context.
 * - get-dotenv env is treated as the SMOZ stage; dynamic config should set
 *   STAGE when desired.
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

  const envStage =
    typeof process.env.STAGE === 'string' ? process.env.STAGE : undefined;
  if (envStage && envStage.trim().length > 0) {
    if (verbose) console.log(`[dev] stage (env): ${envStage}`);
    return envStage.trim();
  }

  // Prefer first non-"default" stage in app.stages (authoritative app config)
  try {
    const appConfigUrl = pathToFileURL(
      path.resolve(root, 'app', 'config', 'app.config.ts'),
    ).href;
    const mod = (await import(appConfigUrl)) as Record<string, unknown>;
    const app = mod.app as
      | {
          stages?: Record<string, unknown>;
        }
      | undefined;
    const stagesObj =
      app && typeof app === 'object'
        ? (app.stages as Record<string, unknown>)
        : undefined;
    if (stagesObj && typeof stagesObj === 'object') {
      const keys = Object.keys(stagesObj).filter((k) => k !== 'default');
      const first = keys[0];
      if (typeof first === 'string' && first.trim().length > 0) {
        if (verbose) console.log(`[dev] stage (app): ${first}`);
        return first;
      }
    }
  } catch {
    // best-effort; fall through
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
          stages?: Record<string, unknown>;
        }
      | undefined;
    const globalKeys: readonly unknown[] = Array.isArray(app?.global?.envKeys)
      ? app.global.envKeys
      : [];
    const stageKeys: readonly unknown[] = Array.isArray(app?.stage?.envKeys)
      ? app.stage.envKeys
      : [];

    const stagesObj = app && typeof app === 'object' ? app.stages : undefined;
    const globalParams =
      stagesObj &&
      typeof stagesObj.default === 'object' &&
      stagesObj.default !== null
        ? (((stagesObj.default as Record<string, unknown>).params ??
            {}) as Record<string, unknown>)
        : {};
    const stageParams =
      stagesObj &&
      typeof stagesObj[stage] === 'object' &&
      stagesObj[stage] !== null
        ? (((stagesObj[stage] as Record<string, unknown>).params ??
            {}) as Record<string, unknown>)
        : {};

    // Prefer stage overrides for global keys when present (stage schema extends global.partial()).
    const getParamValue = (key: string): unknown =>
      key in stageParams ? stageParams[key] : globalParams[key];

    const seedPair = (key: string, value: unknown) => {
      if (key in process.env) return;
      if (value === undefined) return;
      if (typeof value === 'string') {
        process.env[key] = value;
        if (verbose) console.log(`[dev] env: ${key}=${value}`);
        return;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        const v = String(value);
        process.env[key] = v;
        if (verbose) console.log(`[dev] env: ${key}=${v}`);
        return;
      }
      // Non-primitive; skip to avoid [object Object] surprise.
      if (verbose) console.log(`[dev] env: skip ${key} (non-primitive)`);
    };

    for (const k of globalKeys) {
      if (typeof k === 'string') {
        seedPair(k, getParamValue(k));
      }
    }
    for (const k of stageKeys) {
      if (typeof k === 'string') {
        seedPair(k, stageParams[k]);
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
