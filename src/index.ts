/**
 * SMOZ — Serverless + Middy + OpenAPI + Zod
 *
 * Public entry point for the toolkit. Import from '@karmaniverous/smoz' in application code.
 *
 * Exposes:
 * - App orchestrator (schema‑first) to register functions and aggregate
 *   Serverless + OpenAPI artifacts.
 * - HTTP runtime wrapper and middleware building blocks.
 * - Helpers and commonly used types.
 *
 * @packageDocumentation
 */

/**
 * Public entry point for the toolkit. Stack code must import only from '@/src'.
 * Exposes runtime wrappers, middleware, builders, and commonly used types.
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
/** Detects 'my' | 'private' | 'public' from an API Gateway event. */
export { detectSecurityContext } from './runtime/detectSecurityContext';
/** Wrap a business handler with SMOZ runtime (HTTP or non‑HTTP). */
export { wrapHandler } from './runtime/wrapHandler';
/** HTTP customization (options/profiles/transform helpers). */
export type {
  AppHttpConfig,
  FunctionHttpConfig,
  HttpProfile,
  HttpStackOptions,
} from './http/middleware/httpStackCustomization';
export { buildSafeDefaults } from './http/middleware/httpStackCustomization';
export {
  findIndex,
  getId,
  insertAfter,
  insertBefore,
  removeStep,
  replaceStep,
  tagStep,
} from './http/middleware/transformUtils';

// Types
export type { MethodKey } from './types/FunctionConfig';
export type { Handler } from './types/Handler';
export type { HandlerOptions, ShapedEvent } from './types/Handler';
export { type HttpContext, httpContexts } from './types/HttpContext';
export type { LambdaEvent } from './types/LambdaEvent';
export type { ConsoleLogger } from './types/Loggable';
export type { SecurityContextHttpEventMap } from './types/SecurityContextHttpEventMap';

// Path utilities (context ↔ path mapping)
export { buildPathElements, inferContextFromPath } from './http/buildPath';

// Note: internal helpers (asApiMiddleware, httpZodValidator, shortCircuitHead,
// envBuilder functions, stagesFactory, etc.) are intentionally not re-exported
// from the public entry to keep the surface minimal and stable.

// Cross-platform path helpers (for templates and app config derivations).
// Small and stable; safe to include in the public surface.
export { dirFromHere, toPosixPath } from './util/path';
