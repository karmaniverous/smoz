/**
 * Path utilities for cross-platform hygiene.
 *
 * - toPosixPath: normalize Windows backslashes to POSIX separators.
 * - dirFromHere: resolve a directory from an import.meta.url, N levels up,
 *   returning a POSIX-normalized absolute path. Supports levelsUp = 0.
 */
import { fileURLToPath } from 'node:url';

/** Normalize a path to POSIX separators. */
export const toPosixPath = (p: string): string => p.replace(/\\/g, '/');

/**
 * Resolve a directory path relative to the current module URL and normalize it.
 *
 * @param metaUrl - typically import.meta.url
 * @param levelsUp - how many directory levels to ascend (default: 0)
 * @returns absolute, POSIX-normalized directory path
 */
export const dirFromHere = (metaUrl: string, levelsUp = 0): string => {
  // Build a URL segment: '.' for 0 (current dir), '../' repeated N for > 0.
  const seg =
    levelsUp <= 0
      ? '.'
      : Array.from({ length: levelsUp })
          .map(() => '..')
          .join('/');
  const url = new URL(`${seg}/`, metaUrl);
  const abs = fileURLToPath(url);
  return toPosixPath(abs);
};
