import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { z } from 'zod';

import { combine } from '@/src/http/middleware/combine';
import type { HttpTransform } from '@/src/http/middleware/transformUtils';
import { assertInvariants, getId } from '@/src/http/middleware/transformUtils';
import type { ConsoleLogger } from '@/src/types/Loggable';

import { buildDefaultPhases } from './defaultSteps';
import type {
  ApiMiddleware,
  AppHttpConfig,
  FunctionHttpConfig,
  HttpStackOptions,
} from './types';

type M = ApiMiddleware;

/** Shallow merge HttpStackOptions left→right. */
const mergeOptions = (
  a?: Partial<HttpStackOptions>,
  b?: Partial<HttpStackOptions>,
): HttpStackOptions => ({ ...(a ?? {}), ...(b ?? {}) });

/** Apply extend lists (append in order) */
const applyExtend = (
  phases: { before: M[]; after: M[]; onError: M[] },
  ext?: { before?: M[]; after?: M[]; onError?: M[] },
) => {
  if (!ext) return;
  if (ext.before?.length) phases.before = [...phases.before, ...ext.before];
  if (ext.after?.length) phases.after = [...phases.after, ...ext.after];
  if (ext.onError?.length) phases.onError = [...phases.onError, ...ext.onError];
};

/** Apply transform callback and validate invariants. */
const applyTransform = (
  phases: { before: M[]; after: M[]; onError: M[] },
  transform?: HttpTransform,
) => {
  if (!transform) return phases;
  const next = transform({
    before: phases.before.slice(),
    after: phases.after.slice(),
    onError: phases.onError.slice(),
  });
  const out = {
    before: next.before ?? phases.before,
    after: next.after ?? phases.after,
    onError: next.onError ?? phases.onError,
  };
  assertInvariants(out);
  return out;
};

/** Zod enforcement per spec. */
const enforceZod = (
  phases: { before: M[]; after: M[]; onError: M[] },
  hasSchemas: boolean,
  fnName: string,
): void => {
  if (!hasSchemas) return;
  const hasBefore = phases.before.some((m) => getId(m) === 'zod-before');
  const hasAfter = phases.after.some((m) => getId(m) === 'zod-after');
  if (!hasBefore || !hasAfter) {
    throw new Error(
      `Zod validation is required (schemas provided) but is missing after stack customization on function '${fnName}'. ` +
        `Include the standard httpZodValidator or tag your custom validator steps as 'zod-before' and 'zod-after'.`,
    );
  }
};

/** Compute final stack given app-level and function-level customization. */
export const computeHttpMiddleware = (args: {
  functionName: string;
  eventSchema?: z.ZodType | undefined;
  responseSchema?: z.ZodType | undefined;
  logger?: ConsoleLogger;
  contentType?: string;
  app?: AppHttpConfig;
  fn?: FunctionHttpConfig;
}): MiddlewareObj<APIGatewayProxyEvent, Context> => {
  const {
    functionName,
    eventSchema,
    responseSchema,
    logger: maybeLogger,
    contentType: maybeContentType,
    app,
    fn,
  } = args;

  const baseContentType = (
    maybeContentType ?? 'application/json'
  ).toLowerCase();
  let effective: HttpStackOptions = {
    contentType: baseContentType,
    logger: maybeLogger ?? console,
  };

  // Layer A: app.defaults.options
  effective = mergeOptions(effective, app?.defaults);
  // Apply profile (options)
  const profile = fn?.profile ? app?.profiles?.[fn.profile] : undefined;
  effective = mergeOptions(effective, profile);
  // Function-level options
  effective = mergeOptions(effective, fn?.options);

  const contentType = (effective.contentType ?? baseContentType).toLowerCase();
  const logger = effective.logger ?? console;

  // Build default phases with resolved options
  let phases = buildDefaultPhases({
    contentType,
    logger,
    opts: effective,
    eventSchema,
    responseSchema,
  });

  // Layer B: extend (app.defaults → profile → function)
  applyExtend(
    phases,
    (
      app?.defaults as
        { extend?: { before?: M[]; after?: M[]; onError?: M[] } } | undefined
    )?.extend,
  );
  applyExtend(phases, profile?.extend);
  applyExtend(phases, fn?.extend);

  // Layer C: transform (app.defaults → profile → function)
  phases = applyTransform(
    phases,
    (app?.defaults as { transform?: HttpTransform } | undefined)?.transform,
  );
  phases = applyTransform(phases, profile?.transform);
  phases = applyTransform(phases, fn?.transform);

  // Invariants (pre-replace)
  assertInvariants(phases);

  // Zod enforcement (pre-replace)
  enforceZod(phases, !!(eventSchema || responseSchema), functionName);

  // Layer D: replace (full override)
  if (fn?.replace?.stack) {
    const rep = fn.replace.stack;
    if (
      typeof rep === 'object' &&
      'before' in (rep as Record<string, unknown>)
    ) {
      const p = rep as { before?: M[]; after?: M[]; onError?: M[] };
      const final = {
        before: p.before ?? [],
        after: p.after ?? [],
        onError: p.onError ?? [],
      };
      assertInvariants(final);
      enforceZod(final, !!(eventSchema || responseSchema), functionName);
      return combine(...final.before, ...final.after, ...final.onError);
    }
    // Single middleware replacement: cannot validate presence of zod steps.
    if (eventSchema || responseSchema) {
      throw new Error(
        `Full replace provided as a single middleware object on function '${functionName}', but schemas are present. ` +
          `To satisfy Zod enforcement, provide phased arrays including steps tagged as 'zod-before' and 'zod-after'.`,
      );
    }
    return rep as MiddlewareObj<APIGatewayProxyEvent, Context>;
  }

  // Compose final combined stack
  return combine(...phases.before, ...phases.after, ...phases.onError);
};
