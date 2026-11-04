import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  binaryMediaTypesOf,
  DEFAULT_BINARY_MEDIA_TYPES,
} from './binaryMediaTypes';

export type AppLike = {
  buildAllServerlessFunctions: () => Record<string, unknown>;
};

/**
 * Load downstream registers to populate the app registry.
 * Tries TS/JS candidates and logs which one was loaded when SMOZ_VERBOSE is set.
 */
export const loadRegisters = async (root: string): Promise<void> => {
  const candidates = [
    path.resolve(root, 'app', 'generated', 'register.functions.ts'),
    path.resolve(root, 'app', 'generated', 'register.functions.mts'),
    path.resolve(root, 'app', 'generated', 'register.functions.js'),
    path.resolve(root, 'app', 'generated', 'register.functions.mjs'),
  ];
  for (const p of candidates) {
    try {
      const url = pathToFileURL(p).href;
      await import(url);
      if (process.env.SMOZ_VERBOSE) {
        const rel = path.relative(root, p).split(path.sep).join('/');
        console.log('[inline] registers loaded:', rel);
      }
      return;
    } catch {
      // try next candidate
    }
  }
  console.warn(
    '[inline] Could not load app/generated/register.functions.*. Run "npx smoz register" before inline dev.',
  );
};

/**
 * Load the App instance (TS source) from the downstream project.
 * Returns only the surface needed by the inline server.
 */
export const loadApp = async (root: string): Promise<AppLike> => {
  const p = path.resolve(root, 'app', 'config', 'app.config.ts');
  const url = pathToFileURL(p).href;
  const mod = (await import(url)) as Record<string, unknown>;
  const app = mod.app as AppLike | undefined;
  if (!app || typeof app.buildAllServerlessFunctions !== 'function') {
    throw new Error(
      'Failed to load app/config/app.config.ts (missing export "app").',
    );
  }
  return app;
};

/** Binary media types the inline server applies, and where they came from. */
export type BinaryMediaTypes = {
  types: readonly string[];
  /** Human-readable origin, printed at startup. */
  source: string;
};

/**
 * Load `provider.apiGateway.binaryMediaTypes` from the project's
 * `serverless.ts`, so request bodies are encoded in dev as the deployed API
 * encodes them. Falls back to {@link DEFAULT_BINARY_MEDIA_TYPES} when the file
 * is missing or fails to load (with a warning naming the error).
 */
export const loadBinaryMediaTypes = async (
  root: string,
): Promise<BinaryMediaTypes> => {
  const p = path.resolve(root, 'serverless.ts');
  const fallback = (why: string): BinaryMediaTypes => ({
    types: DEFAULT_BINARY_MEDIA_TYPES,
    source: `defaults (${why})`,
  });
  if (!existsSync(p)) return fallback('no serverless.ts');
  try {
    const mod = (await import(pathToFileURL(p).href)) as { default?: unknown };
    return {
      // Serverless accepts a Promise as the default export.
      types: binaryMediaTypesOf(await mod.default),
      source: 'serverless.ts provider.apiGateway.binaryMediaTypes',
    };
  } catch (e) {
    console.warn(
      `[inline] Could not load serverless.ts to read binaryMediaTypes (${String(e)}); using defaults.`,
    );
    return fallback('serverless.ts failed to load');
  }
};
