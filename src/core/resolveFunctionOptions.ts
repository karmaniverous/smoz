/**
 * Resolve per-function options: derive identity fields from the caller's
 * location and apply app-level function defaults.
 *
 * Precedence for every field: explicit value \> `functionDefaults` \>
 * built-in default.
 */
import { dirname, isAbsolute, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  DefineFunctionOptions,
  FunctionDefaults,
  FunctionNameContext,
  FunctionNameStyle,
  ResolvedFunctionOptions,
} from '@/src/core/functionOptions';
import type { FunctionHttpConfig } from '@/src/http/middleware/customization/types';
import { toPosixPath } from '@/src/util/path';

/** App-level inputs to resolution. */
export interface ResolveFunctionContext {
  /** POSIX app root. */
  appRootAbs: string;
  /** Keys of the app's eventTypeMapSchema. */
  eventTypeKeys: readonly string[];
  functionDefaults?: FunctionDefaults | undefined;
}

/**
 * Path segments of `to` relative to `from`, or undefined when `to` isn't
 * inside `from` (or on another drive).
 */
const segmentsUnder = (from: string, to: string): string[] | undefined => {
  const rel = relative(from, to);
  if (rel.startsWith('..') || isAbsolute(rel)) return undefined;
  return rel.split(sep).filter(Boolean);
};

const deriveEventType = (
  callerDir: string,
  ctx: ResolveFunctionContext,
): string => {
  const functionsRoot = posix.join(ctx.appRootAbs, 'functions');
  const eventType = segmentsUnder(functionsRoot, callerDir)?.[0];
  if (!eventType) {
    throw new Error(
      `defineFunction: cannot derive eventType for ${callerDir}: it is not under ${functionsRoot}/<eventType>/. ` +
        'Move the file under functions/<eventType>/ or pass eventType explicitly.',
    );
  }
  if (!ctx.eventTypeKeys.includes(eventType)) {
    throw new Error(
      `defineFunction: folder "${eventType}" under ${functionsRoot} is not an event type of this app ` +
        `(known: ${ctx.eventTypeKeys.join(', ')}). ` +
        'Rename the folder, add the token to eventTypeMapSchema, or pass eventType explicitly.',
    );
  }
  return eventType;
};

/** Built-in name: caller dir relative to appRootAbs, joined with `_`. */
const builtInFunctionName = (callerDir: string, appRootAbs: string) => {
  const parts = relative(appRootAbs, callerDir)
    .split(sep)
    .join('/')
    .split('/')
    .filter(Boolean);
  // Drop leading 'app' segment if present, per repo convention
  if (parts[0] === 'app') parts.shift();
  return parts.join('_');
};

const kebab = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const applyNameStyle = (
  style: FunctionNameStyle,
  callerDir: string,
  eventType: string,
  endpointsRootAbs: string,
  defaultName: string,
): string => {
  const segments = segmentsUnder(endpointsRootAbs, callerDir);
  if (!segments) {
    throw new Error(
      `defineFunction: cannot apply functionDefaults.functionName for ${callerDir}: it is not under ${endpointsRootAbs}. ` +
        'Pass functionName explicitly.',
    );
  }
  const nameCtx: FunctionNameContext = { eventType, segments, defaultName };
  return style === 'kebab' ? segments.map(kebab).join('-') : style(nameCtx);
};

/**
 * Combine `functionDefaults.http` with a function's own `http`: top-level
 * keys from the function win; `options` merge shallowly (function wins).
 */
const mergeFunctionHttp = (
  defaults: FunctionHttpConfig | undefined,
  fn: FunctionHttpConfig | undefined,
): FunctionHttpConfig | undefined => {
  if (!defaults || !fn) return fn ?? defaults;
  const merged: FunctionHttpConfig = { ...defaults, ...fn };
  if (defaults.options && fn.options)
    merged.options = { ...defaults.options, ...fn.options };
  return merged;
};

/** Unique union of default and per-function env keys, defaults first. */
const mergeFnEnvKeys = (
  defaults: readonly PropertyKey[] | undefined,
  fn: readonly PropertyKey[] | undefined,
): PropertyKey[] => Array.from(new Set([...(defaults ?? []), ...(fn ?? [])]));

/**
 * Resolve options passed to `defineFunction` into the stored config.
 *
 * Fields not derived or defaulted here are carried over unchanged, so a new
 * {@link DefineFunctionOptions} field needs no change in this function.
 *
 * @param options - options as passed to `defineFunction`
 * @param ctx - app root, event token keys and function defaults
 * @returns options with `functionName`, `eventType` and `endpointsRootAbs` set and defaults applied
 * @throws Error when `eventType` must be derived but the caller isn't under `functions/<eventType>/` of a known event type, or a name style needs segments the caller can't provide
 */
export const resolveFunctionOptions = (
  options: DefineFunctionOptions,
  ctx: ResolveFunctionContext,
): ResolvedFunctionOptions => {
  const defaults = ctx.functionDefaults ?? {};
  const callerDir = toPosixPath(
    dirname(fileURLToPath(options.callerModuleUrl)),
  );

  const eventType = options.eventType ?? deriveEventType(callerDir, ctx);
  const endpointsRootAbs =
    options.endpointsRootAbs ??
    posix.join(ctx.appRootAbs, 'functions', eventType);

  const defaultName = builtInFunctionName(callerDir, ctx.appRootAbs);
  const functionName =
    options.functionName ??
    (defaults.functionName
      ? applyNameStyle(
          defaults.functionName,
          callerDir,
          eventType,
          endpointsRootAbs,
          defaultName,
        )
      : defaultName);

  const fnEnvKeys = mergeFnEnvKeys(defaults.fnEnvKeys, options.fnEnvKeys);

  const httpContexts = options.httpContexts ?? defaults.httpContexts;
  const contentType = options.contentType ?? defaults.contentType;
  const http = mergeFunctionHttp(defaults.http, options.http);

  return {
    ...options,
    functionName,
    eventType,
    endpointsRootAbs,
    ...(fnEnvKeys.length ? { fnEnvKeys } : {}),
    ...(httpContexts ? { httpContexts } : {}),
    ...(contentType ? { contentType } : {}),
    ...(http ? { http } : {}),
  };
};
