/**
 * Represents any value with a `toString` method.
 *
 * @category Types
 */
type Stringifiable = string | number | boolean | bigint | symbol | object;
/**
 * Returns `true` when `value` has `toString` method.
 *
 * @param value - The value to test.
 * @returns `true` if `value` has `toString` method.
 * @category Types
 */
declare const isStringifiable: (value: unknown) => value is Stringifiable;

/**
 * **Non-stringifiable to Default**: returns tagged template function that replaces any expression that has no `toString` property with a default value.
 *
 * @param defaultValue - The default value.
 * @returns Tagged template function that replaces any expression that has no `toString` property with `default`.
 *
 * @example
 * ```ts
 * const value = n2d('default')`string: ${'foo'} number: ${42} boolean: ${true} null: ${null} undefined: ${undefined}`;
 * // value === 'string: foo number: 42 boolean: true null: default undefined: default'
 * ```
 *
 * @category Higher-Order Functions
 */
declare const n2d: (defaultValue: Stringifiable) => (strings: TemplateStringsArray, ...exp: unknown[]) => string;

/**
 * **Non-stringifiable to Empty String**: replaces expressions without toString property with empty strings.
 *
 * @param strings - The string literals.
 * @param exp - The expressions.
 * @returns The output string.
 *
 * @example
 * ```ts
 * const value = n2e`string: ${'foo'} number: ${42} boolean: ${true} null: ${null} undefined: ${undefined}`;
 * // value === 'string: foo number: 42 boolean: true null:  undefined: '
 * ```
 *
 * @category Tagged Templates
 */
declare const n2e: (strings: TemplateStringsArray, ...exp: unknown[]) => string;

/**
 * **Some Non-stringifiable to Default**: returns tagged template function that returns a default value when any expression has no `toString` property.
 *
 * @param defaultValue - The default value.
 * @returns Tagged template function that returns `default` when any expression has no `toString` property.
 *
 * @example
 * ```ts
 * const value = sn2d('default')`string: ${'foo'} number: ${42} boolean: ${true} null: ${null} undefined: ${undefined}`;
 * // value === 'default'
 * ```
 *
 * @category Higher-Order Functions
 */
declare const sn2d: (defaultValue: unknown) => (strings: TemplateStringsArray, ...exp: unknown[]) => unknown;

/**
 * **Some Non-stringifiable to Empty String**: returns empty string when any expression has no `toString` property.
 *
 * @param strings - The string literals.
 * @param exp - The expressions.
 * @returns The output string.
 *
 * @example
 * ```ts
 * const value = sn2e`string: ${'foo'} number: ${42} boolean: ${true} null: ${null} undefined: ${undefined}`;
 * // value === ''
 * ```
 *
 * @category Tagged Templates
 */
declare const sn2e: (strings: TemplateStringsArray, ...exp: unknown[]) => unknown;

/**
 * **Some Non-stringifiable to Null**: returns `null` when any expression has no `toString` property.
 *
 * @param strings - The string literals.
 * @param exp - The expressions.
 * @returns The output string.
 *
 * @example
 * ```ts
 * const value = sn2n`string: ${'foo'} number: ${42} boolean: ${true} null: ${null} undefined: ${undefined}`;
 * // value === null
 * ```
 *
 * @category Tagged Templates
 */
declare const sn2n: (strings: TemplateStringsArray, ...exp: unknown[]) => unknown;

/**
 * **Some Non-stringifiable to Undefined**: returns `undefined` when any expression has no `toString` property.
 *
 * @param strings - The string literals.
 * @param exp - The expressions.
 * @returns The output string.
 *
 * @example
 * ```ts
 * const value = sn2u`string: ${'foo'} number: ${42} boolean: ${true} null: ${null} undefined: ${undefined}`;
 * // value === undefined
 * ```
 *
 * @category Tagged Templates
 */
declare const sn2u: (strings: TemplateStringsArray, ...exp: unknown[]) => unknown;

/**
 * Normalize a string by converting diacriticals to base characters, removing non-word characters, and converting to lower case. Null returns null; all other non-strings return undefined.
 *
 * @param value - The string to normalize.
 * @returns The normalized string or undefined if not a string.
 *
 * @example
 * ```ts
 * const value = normstr('Við skulum fara á fjörðurinn í kvöld.');
 * // value === 'viskulumfaraafjorurinnikvold'
 * ```
 *
 * @category Transformations
 */
declare const normstr: (value?: string | null) => string | null | undefined;

export { isStringifiable, n2d, n2e, normstr, sn2d, sn2e, sn2n, sn2u };
export type { Stringifiable };
