/**
 * REQUIREMENTS ADDRESSED
 * - Provide a minimal generic Lambda event shape that is compatible with
 *   common authoring patterns. An event schema's parsed output is overlaid on it
 *   (see `ShapedEvent`).
 *
 * @remarks
 * Used for internal/non‑HTTP flows when a narrow event type is not desirable.
 */
export type LambdaEvent = Record<string, unknown>;
