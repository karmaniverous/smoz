/**
 * SMOZ — Serverless + Middy + OpenAPI + Zod
 *
 * Config-time entry point. Import from '@karmaniverous/smoz' for App setup,
 * schema definitions, types, and path utilities.
 *
 * For HTTP runtime (wrapHandler, middleware, transforms), import from
 * '@karmaniverous/smoz/http'.
 *
 * @packageDocumentation
 */

export type { AppInit } from './core/App';
export { App } from './core/App';
/** Base event map schema (rest/http/sqs). Extend it in your App. */
export { baseEventTypeMapSchema } from './core/baseEventTypeMapSchema';
export type {
  DefineAppConfigInput,
  DefineAppConfigOutput,
  EnvKeysNode,
  EnvSchemaNode,
  GlobalEnvConfig,
  GlobalParamsNode,
  StageParamsNode,
} from './core/defineAppConfig';
export { defineAppConfig } from './core/defineAppConfig';

// Types
export type { MethodKey } from './types/FunctionConfig';
export type { Handler, HandlerOptions, ShapedEvent } from './types/Handler';
export { type HttpContext, httpContexts } from './types/HttpContext';
export type { LambdaEvent } from './types/LambdaEvent';
export type { ConsoleLogger } from './types/Loggable';
export type { SecurityContextHttpEventMap } from './types/SecurityContextHttpEventMap';

// Path utilities (context → path mapping)
export { buildPathElements, inferContextFromPath } from './http/buildPath';

// Note: internal helpers (asApiMiddleware, httpZodValidator, shortCircuitHead,
// envBuilder functions, stagesFactory, etc.) are intentionally not re-exported
// from the public entry to keep the surface minimal and stable.

// Cross-platform path helpers (for templates and app config derivations).
// Small and stable; safe to include in the public surface.
export { dirFromHere, toPosixPath } from './util/path';
