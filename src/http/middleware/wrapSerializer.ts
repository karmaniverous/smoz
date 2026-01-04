/**
 * Tiny helper to decorate http-response-serializer functions so we can add
 * structured logging around the actual serialization step.
 */
import type { ConsoleLogger } from '@/src/types/Loggable';

/**
 * Wrap a serializer function to add logging.
 *
 * @param fn - The serializer function.
 * @param opts - Logging options.
 * @returns A wrapped serializer function.
 * @typeParam T - The type of the serializer function.
 */
export const wrapSerializer = <T extends (args: { body: unknown }) => string>(
  fn: T,
  opts: { label: string; logger: ConsoleLogger },
): T => {
  return ((args: { body: unknown }) => {
    opts.logger.debug(`serializing ${opts.label} response`);
    const serialized = fn(args);
    opts.logger.debug('serialized response', { serialized });
    return serialized;
  }) as T;
};
