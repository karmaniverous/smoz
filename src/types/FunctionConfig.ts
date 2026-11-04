import type { AWS } from '@serverless/typescript';
import type { z } from 'zod';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import type { BaseEventTypeMap } from '@/src/core/baseEventTypeMapSchema';
import type { FunctionHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import type { HttpContext } from '@/src/types/HttpContext';
import type { ConsoleLogger } from '@/src/types/Loggable';

import type { PropFromUnion } from './PropFromUnion';
/** HTTP methods supported from zod-openapi's PathItem shape (excluding helper 'id'). */
export type MethodKey = keyof Omit<ZodOpenApiPathItemObject, 'id'>;

/**
 * FunctionConfig
 * - Per-function schemas, env requirements, routing metadata.
 * - EventTypeMap binds event tokens (e.g., 'rest'|'http'|'sqs') to runtime shapes.
 * - HTTP-only options are permitted only when EventType is an HTTP token.
 *
 * @typeParam EventSchema   - optional Zod schema for event (validated pre‑handler)
 * @typeParam ResponseSchema- optional Zod schema for response (validated post‑handler)
 * @typeParam GlobalParams  - app global params record
 * @typeParam StageParams   - app stage params record
 * @typeParam EventTypeMap  - event token → runtime type map
 * @typeParam EventType     - selected event token
 *
 * @remarks
 * The SMOZ wrapper reads env keys from this config’s brand and builds a typed `options.env`,
 * then applies HTTP middleware iff the token is in the app’s HTTP tokens set.
 */
export type FunctionConfig<
  EventSchema extends z.ZodType | undefined,
  ResponseSchema extends z.ZodType | undefined,
  GlobalParams extends Record<string, unknown>,
  StageParams extends Record<string, unknown>,
  EventTypeMap extends BaseEventTypeMap,
  EventType extends keyof EventTypeMap,
> = {
  /** Unique function name; used across serverless/OpenAPI outputs. */
  functionName: string;

  /** Compile-time token selecting the runtime event type (e.g., 'rest' | 'http' | 'sqs'). */
  eventType: EventType;

  /** Optional; defaults to [] wherever consumed. */
  fnEnvKeys?: readonly (keyof GlobalParams | keyof StageParams)[];

  /** Optional Zod schemas applied uniformly across all handlers. */
  eventSchema?: EventSchema;
  responseSchema?: ResponseSchema;
  /** Optional extra serverless events (e.g., SQS triggers). */
  events?: PropFromUnion<AWS['functions'], string>['events'];

  /** Optional logger; wrapper will default to `console`. */
  logger?: ConsoleLogger;
} & (EventType extends keyof Pick<BaseEventTypeMap, 'rest' | 'http'>
  ? {
      /** HTTP-only options (permitted for base HTTP tokens). */
      httpContexts?: readonly HttpContext[];
      method?: MethodKey;
      basePath?: string;
      contentType?: string;
      /** Per-function HTTP middleware customization (profile, options, extend, transform, replace). */
      http?: FunctionHttpConfig;
    }
  : {
      /** Non-HTTP: deny HTTP-only options via type system. */
      httpContexts?: never;
      method?: never;
      basePath?: never;
      contentType?: never;
      http?: never;
    });
