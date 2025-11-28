/* eslint-disable @typescript-eslint/no-explicit-any -- Generic utility type operates at the type level; constrained any is intentional here. */

/** Generic deep override (merge) utility used across the toolkit. */
/**
 * DeepOverride
 * ----------- * For two object types T (base) and U (override), produce a new type where keys present in U
 * replace those in T; nested objects are recursed. Arrays and primitives are replaced wholesale.
 *
 * - If T is `never`, we fall back to U (used when no explicit EventType is provided).
 * - If U is `never`, we keep T.
 *
 * @typeParam T - base type to be overridden
 * @typeParam U - override type whose keys replace the base
 *
 * @example
 * type A = { x: { a: number }, y: string };
 * type B = { x: { a: string }, z: boolean };
 * // => { x: { a: string }, y: string, z: boolean }
 * type R = DeepOverride<A, B>;
 */
export type DeepOverride<T, U> = [T] extends [never]
  ? U
  : [U] extends [never]
    ? T
    : T extends any[]
      ? U
      : U extends any[]
        ? U
        : T extends object
          ? U extends object
            ? {
                [K in keyof T | keyof U]: K extends keyof U
                  ? DeepOverride<
                      K extends keyof T ? T[K] : never,
                      K extends keyof U ? U[K] : never
                    >
                  : K extends keyof T
                    ? T[K]
                    : never;
              }
            : T
          : U;

/**
 * HTTP-aware deep override.
 *
 * For HTTP event properties, when an event schema provides one of the known HTTP
 * keys (pathParameters | queryStringParameters | body), replace the base type for
 * that key strictly with the schema’s type (no merging). For all other keys, fall
 * back to DeepOverride merge behavior.
 *
 * This eliminates unions with APIGW base signatures (e.g., pathParameters null | index-signature)
 * at the handler boundary when a schema is provided — author intent is to shape those
 * HTTP props precisely.
 */
export type DeepOverrideHttp<T, U> = [T] extends [never]
  ? U
  : [U] extends [never]
    ? T
    : T extends any[]
      ? U
      : U extends any[]
        ? U
        : T extends object
          ? U extends object
            ? {
                [K in keyof T | keyof U]: K extends HttpPropKeys
                  ? // Strict replacement: if the schema provides this HTTP key, use it; else keep base.
                    K extends keyof U
                    ? U[K]
                    : K extends keyof T
                      ? T[K]
                      : never
                  : // Non-HTTP: merge recursively via DeepOverride
                    K extends keyof U
                    ? DeepOverride<
                        K extends keyof T ? T[K] : never,
                        K extends keyof U ? U[K] : never
                      >
                    : K extends keyof T
                      ? T[K]
                      : never;
              }
            : T
          : U;

/** HTTP props that receive strict replacement when present in the event schema. */
type HttpPropKeys = 'pathParameters' | 'queryStringParameters' | 'body';
