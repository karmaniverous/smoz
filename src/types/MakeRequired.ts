/**
 * Makes specified properties of `T` required.
 *
 * @typeParam T - The type to make properties required.
 * @typeParam U - The properties to make required.
 *
 * @example
 * ```ts
 * interface A { x?: number; y?: string; z: boolean }
 * // => { x: number; y?: string; z: boolean }
 * type R = MakeRequired<A, 'x'>;
 * ```
 */
export type MakeRequired<T extends object, U extends keyof T> = {
  [P in keyof T as P extends U ? never : P]: T[P];
} & Required<Pick<T, U>>;
