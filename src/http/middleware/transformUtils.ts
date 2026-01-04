/**
 * Transform helpers for HTTP middleware stacks.
 *
 * - Steps are identified by a non-enumerable __id property on MiddlewareObj.
 * - Utilities operate on arrays immutably and return new arrays.
 * * Requirements addressed:
 * - insertBefore, insertAfter, replaceStep, removeStep, findIndex, getId
 */
import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

const ID_PROP = '__id' as const;
/** Alias for an API Gateway middleware object. */
export type ApiMiddleware = MiddlewareObj<APIGatewayProxyEvent, Context>;

/** Identifiers for standard middleware steps. */
export type StepId =
  | 'head'
  | 'header-normalizer'
  | 'event-normalizer'
  | 'content-negotiation'
  | 'json-body-parser'
  | 'zod-before'
  | 'head-finalize'
  | 'zod-after'
  | 'error-expose'
  | 'error-handler'
  | 'cors'
  | 'preferred-media'
  | 'shape'
  | 'serializer';

/** Attach a non-enumerable __id to a middleware step. */
export const tagStep = (mw: ApiMiddleware, id: StepId): ApiMiddleware => {
  if (!Object.prototype.hasOwnProperty.call(mw, ID_PROP)) {
    Object.defineProperty(mw, ID_PROP, { value: id, enumerable: false });
  }
  return mw;
};

/** Retrieve a step's id, if present. */
export const getId = (mw: ApiMiddleware): StepId | undefined =>
  (mw as Record<string, unknown>)[ID_PROP] as StepId | undefined;

/** Find index of a step by id. */
export const findIndex = (list: ApiMiddleware[], id: StepId): number =>
  list.findIndex((m) => getId(m) === id);

/** Insert a step before the step with given id. */
export const insertBefore = (
  list: ApiMiddleware[],
  id: StepId,
  mw: ApiMiddleware,
): ApiMiddleware[] => {
  const i = findIndex(list, id);
  if (i < 0) return list.slice();
  return [...list.slice(0, i), mw, ...list.slice(i)];
};

/** Insert a step after the step with given id. */
export const insertAfter = (
  list: ApiMiddleware[],
  id: StepId,
  mw: ApiMiddleware,
): ApiMiddleware[] => {
  const i = findIndex(list, id);
  if (i < 0) return list.slice();
  return [...list.slice(0, i + 1), mw, ...list.slice(i + 1)];
};

/** Replace a step with given id. */
export const replaceStep = (
  list: ApiMiddleware[],
  id: StepId,
  mw: ApiMiddleware,
): ApiMiddleware[] => {
  const i = findIndex(list, id);
  if (i < 0) return list.slice();
  const out = list.slice();
  out[i] = mw;
  return out;
};

/** Remove a step with given id. */
export const removeStep = (
  list: ApiMiddleware[],
  id: StepId,
): ApiMiddleware[] => {
  const i = findIndex(list, id);
  if (i < 0) return list.slice();
  return [...list.slice(0, i), ...list.slice(i + 1)];
};

/** Arrays representing the three middleware phases. */
export type PhasedArrays = {
  /** Before phase middleware. */
  before?: ApiMiddleware[];
  /** After phase middleware. */
  after?: ApiMiddleware[];
  /** OnError phase middleware. */
  onError?: ApiMiddleware[];
};

/** Function that transforms middleware phases. */
export type HttpTransform = (stack: {
  /** Current before phase. */
  before: ApiMiddleware[];
  /** Current after phase. */
  after: ApiMiddleware[];
  /** Current onError phase. */
  onError: ApiMiddleware[];
}) => Partial<{
  /** New before phase. */
  before: ApiMiddleware[];
  /** New after phase. */
  after: ApiMiddleware[];
  /** New onError phase. */
  onError: ApiMiddleware[];
}>;

/** Invariant validation helpers */
export const assertInvariants = (phases: {
  before: ApiMiddleware[];
  after: ApiMiddleware[];
  onError: ApiMiddleware[];
}): void => {
  const { before, after } = phases;
  if (before.length === 0 || getId(before[0] as ApiMiddleware) !== 'head') {
    throw new Error("Invariant violation: 'head' must be first in before.");
  }
  if (
    after.length === 0 ||
    getId(after[after.length - 1] as ApiMiddleware) !== 'serializer'
  ) {
    throw new Error("Invariant violation: 'serializer' must be last in after.");
  }
  const shapeIdx = findIndex(after, 'shape');
  const serialIdx = findIndex(after, 'serializer');
  if (shapeIdx < 0 || serialIdx < 0 || shapeIdx >= serialIdx) {
    throw new Error(
      "Invariant violation: 'shape' must precede 'serializer' in after.",
    );
  }
  const illegal = (arr: ApiMiddleware[]) =>
    arr.find((m) => getId(m) === 'error-handler');
  if (illegal(before) || illegal(after)) {
    throw new Error(
      "Illegal placement: 'error-handler' may only appear in onError phase.",
    );
  }
};
