/**
 * Resolve per-function options: derive identity fields from the caller's
 * location and apply app-level function defaults.
 *
 * Precedence for every field: explicit value \> `functionDefaults` \>
 * built-in default. `functionDefaults.http` and `functionDefaults.contentType`
 * are not applied here: they are layers of the HTTP middleware stack (see
 * `computeHttpMiddleware`), so the stored `contentType` is only the
 * function's own and beats every HTTP default there.
 */
import { dirname, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import type {
  DefineFunctionOptions,
  FunctionDefaults,
  FunctionNameContext,
  FunctionNameStyle,
  FunctionServerlessConfig,
  ResolvedFunctionOptions,
} from '@/src/core/functionOptions';
import { resolveHttpFromFunctionConfig } from '@/src/http/resolveHttpFromFunctionConfig';
import { segmentsUnder, toPosixPath } from '@/src/util/path';

/** App-level inputs to resolution. */
export interface ResolveFunctionContext {
  /** POSIX app root (see `derivationRoot` for the bundled case). */
  appRootAbs: string;
  /** Keys of the app's eventTypeMapSchema. */
  eventTypeKeys: readonly string[];
  /** Event tokens treated as HTTP. */
  httpEventTypeTokens: readonly string[];
  functionDefaults?: FunctionDefaults | undefined;
}

/**
 * The root that derivation measures the caller against: `appRootAbs`, unless
 * the app config was bundled into the function.
 *
 * esbuild inlines `app.config.ts` into each function bundle, so an
 * `appRootAbs` computed from the config's `import.meta.url` points inside the
 * bundle's own folder (e.g. `/var/task/app/functions/rest/users` for
 * `/var/task/app/functions/rest/users/get/handler.mjs`). The caller's path
 * still mirrors the source tree, so when the caller isn't under
 * `<appRootAbs>/functions/<folder>/` the root is recovered from it: the folder
 * holding the caller's last `functions/<eventType>/` pair for a known event
 * type, if `appRootAbs` lies within that `functions` folder (the bundled
 * case). Otherwise `appRootAbs` stays the root, so unbundled results don't
 * change.
 *
 * @param callerDir - POSIX directory of the calling module
 * @param ctx - app root and event type keys
 * @returns POSIX root whose `functions/<eventType>/` holds the caller, or `appRootAbs`
 */
const derivationRoot = (
  callerDir: string,
  ctx: ResolveFunctionContext,
): string => {
  if (segmentsUnder(posix.join(ctx.appRootAbs, 'functions'), callerDir))
    return ctx.appRootAbs;
  const segs = callerDir.split('/');
  for (let i = segs.length - 2; i >= 0; i--) {
    if (segs[i] !== 'functions' || !ctx.eventTypeKeys.includes(segs[i + 1]!))
      continue;
    // Trailing slash keeps a drive or filesystem root absolute ('C:/', '/').
    const root = `${segs.slice(0, i).join('/')}/`;
    return segmentsUnder(posix.join(root, 'functions'), ctx.appRootAbs)
      ? root
      : ctx.appRootAbs;
  }
  return ctx.appRootAbs;
};

const deriveEventType = (
  callerDir: string,
  root: string,
  ctx: ResolveFunctionContext,
): string => {
  const functionsRoot = posix.join(root, 'functions');
  const eventType = segmentsUnder(functionsRoot, callerDir)?.[0];
  if (!eventType) {
    throw new Error(
      `defineFunction: cannot derive eventType for ${callerDir}: it is not under ${functionsRoot}/<eventType>/ ` +
        `and its path has no functions/<eventType>/ folder for an event type of this app (known: ${ctx.eventTypeKeys.join(', ')}). ` +
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

/** Built-in name: caller dir relative to the derivation root, joined with `_`. */
const builtInFunctionName = (callerDir: string, root: string) => {
  const parts = relative(root, callerDir)
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
 * Check that an HTTP function whose eventType came from its folder has a
 * derivable route, so a misplaced file fails at definition time instead of
 * silently getting no HTTP event and no OpenAPI path.
 */
const assertDerivableRoute = (
  options: DefineFunctionOptions,
  eventType: string,
  endpointsRootAbs: string,
  callerDir: string,
): void => {
  try {
    resolveHttpFromFunctionConfig(
      {
        functionName: '',
        eventType: eventType as keyof BaseEventTypeMap,
        ...(options.method ? { method: options.method } : {}),
        ...(options.basePath ? { basePath: options.basePath } : {}),
      },
      options.callerModuleUrl,
      endpointsRootAbs,
    );
  } catch (error) {
    throw new Error(
      `defineFunction: cannot derive the HTTP route for ${callerDir} (eventType "${eventType}" from its folder): ` +
        `${(error as Error).message} ` +
        `Put the file in functions/${eventType}/<path>/<method>/ (e.g. functions/${eventType}/users/get/lambda.ts) ` +
        'or pass method and basePath explicitly.',
      { cause: error },
    );
  }
};

/**
 * `functionDefaults.serverless` with the function's `serverless` over it,
 * key by key. `image` merges one level deeper when both are objects (e.g. a
 * default `uri` with a per-function `command`).
 */
const mergeServerless = (
  defaults: FunctionServerlessConfig | undefined,
  fn: FunctionServerlessConfig | undefined,
): FunctionServerlessConfig | undefined => {
  if (!defaults && !fn) return undefined;
  const merged = { ...defaults, ...fn };
  if (typeof defaults?.image === 'object' && typeof fn?.image === 'object')
    merged.image = { ...defaults.image, ...fn.image };
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
 * @throws Error when `eventType` must be derived but the caller isn't under `functions/<eventType>/` of a known event type (measured from `appRootAbs`, or from the caller's own path when the app config is bundled into the function); when a derived HTTP `eventType`'s method or base path can't be derived; or when a name style needs segments the caller can't provide
 */
export const resolveFunctionOptions = (
  options: DefineFunctionOptions,
  ctx: ResolveFunctionContext,
): ResolvedFunctionOptions => {
  const defaults = ctx.functionDefaults ?? {};
  const callerDir = toPosixPath(
    dirname(fileURLToPath(options.callerModuleUrl)),
  );

  const root = derivationRoot(callerDir, ctx);

  const eventType = options.eventType ?? deriveEventType(callerDir, root, ctx);
  const endpointsRootAbs =
    options.endpointsRootAbs ?? posix.join(root, 'functions', eventType);
  // An explicit eventType keeps the old behaviour (no route check).
  if (
    options.eventType === undefined &&
    ctx.httpEventTypeTokens.includes(eventType)
  )
    assertDerivableRoute(options, eventType, endpointsRootAbs, callerDir);

  const defaultName = builtInFunctionName(callerDir, root);
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
  const serverless = mergeServerless(defaults.serverless, options.serverless);

  return {
    ...options,
    functionName,
    eventType,
    endpointsRootAbs,
    ...(fnEnvKeys.length ? { fnEnvKeys } : {}),
    ...(httpContexts ? { httpContexts } : {}),
    ...(serverless ? { serverless } : {}),
  };
};
