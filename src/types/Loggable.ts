/** Interface for a console-compatible logger. */
export type ConsoleLogger = Pick<Console, 'debug' | 'error' | 'info' | 'log'>;

/**
 * Mixin for logger‑accepting options.
 *
 * @typeParam Logger - a console‑compatible logger
 * @remarks
 * SMOZ defaults to the global console; you can supply your own if desired.
 */
export interface Loggable<Logger extends ConsoleLogger> {
  /** The logger instance. */
  logger: Logger;
}
