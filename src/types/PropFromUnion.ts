/**
 * Extract the property type `K` from a union of object types `U`.
 *
 * @typeParam U - union of object types
 * @typeParam K - property key to extract
 *
 * @example
 * ```ts
 * type U = { a: number } | { a: string; b: boolean };
 * // => number | string
 * type A = PropFromUnion<U, 'a'>;
 * ```
 */
export type PropFromUnion<U, K extends PropertyKey> = Extract<
  U,
  Record<K, unknown>
>[K];
