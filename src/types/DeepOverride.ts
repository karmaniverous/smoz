/* eslint-disable @typescript-eslint/no-explicit-any -- Generic utility type operates at the type level; constrained any is intentional here. */

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
