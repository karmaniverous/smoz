/**
 * SMOZ HTTP runtime entry point.
 *
 * Import from '@karmaniverous/smoz/http' for runtime HTTP middleware,
 * handler wrapping, and middleware transform utilities.
 *
 * This subpath is separated from the main entry to avoid pulling middy
 * into config-time esbuild resolution (Serverless Framework config parsing).
 *
 * @packageDocumentation
 */

/** Wrap a business handler with SMOZ runtime (HTTP or non-HTTP). */
export { wrapHandler } from './runtime/wrapHandler';

/** Detects 'my' | 'private' | 'public' from an API Gateway event. */
export { detectSecurityContext } from './runtime/detectSecurityContext';

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

// Handler types that depend on middleware concepts
export type { HandlerOptions, ShapedEvent } from './types/Handler';
