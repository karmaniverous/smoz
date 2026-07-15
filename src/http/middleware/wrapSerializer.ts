/**
 * Tiny helper to decorate http-response-serializer functions so we can add
 * structured logging around the actual serialization step.
 */
import type { ConsoleLogger } from '@/src/types/Loggable';

export const wrapSerializer = <T extends (args: { body?: unknown }) => string>(
  fn: T,
  opts: { label: string; logger: ConsoleLogger },
): T => {
  return ((args: { body?: unknown }) => {
    opts.logger.debug(`serializing ${opts.label} response`);
    const serialized = fn(args);
    opts.logger.debug('serialized response', { serialized });
    return serialized;
  }) as T;
};
