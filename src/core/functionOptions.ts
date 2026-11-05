/**
 * Per-function options shared by {@link App.defineFunction} and the registry.
 *
 * Defined once so a field added here reaches the stored registry entry and
 * the branded runtime config without being listed again anywhere else.
 */
import type { AWS } from '@serverless/typescript';
import type { z } from 'zod';

import type { FunctionHttpConfig } from '@/src/http/middleware/customization/types';
import type { BaseOperation } from '@/src/openapi/types';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';

/**
 * Serverless Framework function properties SMOZ passes through unchanged
 * (e.g. `memorySize`, `timeout`, `tenancy`, `image`, `layers`).
 *
 * `handler`, `events` and `environment` are owned by SMOZ and excluded:
 * the handler derives from the file location, events from the HTTP
 * config or `fn.serverless(extras)`, and the environment from `fnEnvKeys`.
 *
 * With `image` set, SMOZ omits `handler` (Serverless rejects both). An
 * `image` object without `command` gets `command: [<derived handler>]`, the
 * handler's path in the source tree, which only works if the container
 * keeps the project layout; with a string `image`, the container's CMD must
 * name the handler.
 */
export type FunctionServerlessConfig = Omit<
  NonNullable<AWS['functions']>[string],
  'handler' | 'events' | 'environment'
>;

/**
 * Options accepted by `app.defineFunction(...)`.
 *
 * Only `callerModuleUrl` is required. Every other field is either optional or
 * derived from the file's location under `<appRootAbs>/functions` and the
 * app's `functionDefaults`. An explicit value always wins over a derived or
 * defaulted one.
 *
 * Derivation gives the same result inside a deployed bundle: when esbuild
 * inlines the app config into the function, so `appRootAbs` points inside a
 * `functions` folder and the caller isn't under `<appRootAbs>/functions`, the
 * root is the folder holding the caller's last `functions/<eventType>/`
 * (`<eventType>` a key of the app's `eventTypeMapSchema`). Read
 * `<appRootAbs>` below as that root.
 *
 * @typeParam EventType      - event token (a key of the app's eventTypeMapSchema)
 * @typeParam EventSchema    - optional Zod schema validated before the handler
 * @typeParam ResponseSchema - optional Zod schema validated after the handler
 * @typeParam EnvKey         - keys of the app's global and stage params
 */
export interface DefineFunctionOptions<
  EventType extends string = string,
  EventSchema extends z.ZodType | undefined = z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined = z.ZodType | undefined,
  EnvKey extends PropertyKey = PropertyKey,
> {
  /**
   * Unique function name, used as the Serverless function key.
   *
   * Defaults to `functionDefaults.functionName` when set, else the caller's
   * directory relative to `appRootAbs`, joined with `_`
   * (e.g. `functions_rest_hello_get`).
   */
  functionName?: string;
  /**
   * Event token selecting the runtime event type (e.g. `'rest'`, `'sqs'`).
   *
   * Defaults to the first folder under `<appRootAbs>/functions` that contains
   * the caller (`functions/rest/users/get/lambda.ts` gives `'rest'`). Throws
   * at definition time when the caller isn't under `functions/<eventType>/` or
   * that folder isn't a key of the app's `eventTypeMapSchema`.
   *
   * @remarks
   * Given explicitly, the literal token types the handler's event. Omitted,
   * the type widens to the union of the map's event types, so pass it
   * explicitly when the handler needs the narrowed event type.
   */
  eventType?: EventType;
  /** HTTP method. Defaults to the last folder name (e.g. `get`). */
  method?: MethodKey;
  /** HTTP base path. Defaults to the folders between `endpointsRootAbs` and the method folder. */
  basePath?: string;
  /** Security contexts to expose. Defaults to `functionDefaults.httpContexts`, else `['public']`. */
  httpContexts?: readonly HttpContext[];
  /**
   * Response content type. Beats every default (`functionDefaults.contentType`,
   * app `http.defaults`, `functionDefaults.http.options` and the selected
   * profile); only this function's own `http.options.contentType` beats it.
   * Defaults to the highest of those that is set, else `application/json`.
   */
  contentType?: string;
  /**
   * HTTP middleware customization for this function: profile selection,
   * option overrides, extend/transform/replace. Combined with
   * `functionDefaults.http`; see {@link FunctionDefaults.http}.
   */
  http?: FunctionHttpConfig;
  /** Zod schema validated before the handler. */
  eventSchema?: EventSchema;
  /** Zod schema validated after the handler. */
  responseSchema?: ResponseSchema;
  /** Extra env keys exposed to this function (merged with `functionDefaults.fnEnvKeys`). */
  fnEnvKeys?: readonly EnvKey[];
  /**
   * Serverless Framework properties for this function (`memorySize`,
   * `timeout`, `tenancy`, `image`, ...), merged key by key over
   * `functionDefaults.serverless` (`image` one level deeper when both are
   * objects). See {@link FunctionServerlessConfig}.
   */
  serverless?: FunctionServerlessConfig;
  /** `import.meta.url` of the registering module (required). */
  callerModuleUrl: string;
  /**
   * Root that `method` and `basePath` are derived from.
   * Defaults to `<appRootAbs>/functions/<eventType>` (POSIX separators).
   */
  endpointsRootAbs?: string;
}

/** Context passed to a {@link FunctionNameStyle} function. */
export interface FunctionNameContext {
  /** Resolved event token. */
  eventType: string;
  /**
   * Folders from `endpointsRootAbs` to the caller's directory, e.g.
   * `['users', 'get']` for `functions/rest/users/get/lambda.ts`.
   */
  segments: readonly string[];
  /** The name SMOZ would use without a name style (e.g. `functions_rest_users_get`). */
  defaultName: string;
}

/**
 * Function name style for {@link FunctionDefaults.functionName}.
 *
 * - `'kebab'`: {@link FunctionNameContext.segments} in kebab case, joined with
 *   `-` (`rest/user/logo/patch` gives `user-logo-patch`; `postConfirmation`
 *   gives `post-confirmation`).
 * - A function: receives a {@link FunctionNameContext} and returns the name.
 */
export type FunctionNameStyle =
  'kebab' | ((ctx: FunctionNameContext) => string);

/**
 * App-level defaults applied to every function registered with
 * `app.defineFunction`. Precedence for each field: explicit per-function
 * value \> `functionDefaults` \> built-in default.
 *
 * `httpContexts`, `contentType` and `http` only affect HTTP functions;
 * non-HTTP functions ignore them.
 */
export interface FunctionDefaults {
  /** Env keys exposed to every function; merged with each function's `fnEnvKeys` (unique, defaults first). */
  fnEnvKeys?: readonly string[];
  /** Default security contexts for HTTP functions (built-in default `['public']`). */
  httpContexts?: readonly HttpContext[];
  /**
   * Default response content type for HTTP functions (built-in default
   * `application/json`). The lowest HTTP layer: app `http.defaults`,
   * `functionDefaults.http.options`, the selected profile and the function's
   * own `contentType` all beat it.
   */
  contentType?: string;
  /**
   * Default per-function HTTP customization. A default never overrides what
   * the function chose.
   *
   * Options resolve, lowest to highest: app `http.defaults` \<
   * `functionDefaults.http.options` \< the selected profile \< the function's
   * own `contentType` \< its own `http.options`. `profile` is used only when
   * the function sets none (an unknown profile name throws at definition);
   * `extend`, `transform` and `replace` only when the function sets no value
   * for that key (`extend` and `transform` run before the profile's).
   */
  http?: FunctionHttpConfig;
  /**
   * Default Serverless Framework properties for every function, e.g.
   * `{ memorySize: 512 }`. A function's own `serverless` is merged over it
   * key by key; `image` merges one level deeper when both are objects (a
   * default `uri` with a per-function `command`).
   */
  serverless?: FunctionServerlessConfig;
  /**
   * Name style used when a function sets no `functionName`. Without it the
   * built-in name applies. Changing names renames deployed functions.
   */
  functionName?: FunctionNameStyle;
}

/** Per-function options after derivation and defaults (identity fields are always set). */
export type ResolvedFunctionOptions = DefineFunctionOptions &
  Required<
    Pick<
      DefineFunctionOptions,
      'functionName' | 'eventType' | 'endpointsRootAbs'
    >
  >;

/** A registered function, as consumed by the Serverless and OpenAPI aggregators. */
export type FunctionRegistration = ResolvedFunctionOptions & {
  openapiBaseOperation?: BaseOperation;
  serverlessExtras?: unknown;
};
