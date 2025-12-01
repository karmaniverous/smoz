import type { HttpContext } from '@/src/types/HttpContext';

export const splitPath = (basePath: string): string[] =>
  basePath.split('/').filter(Boolean);

/** Prefix non-public contexts and return path elements. */
/**
 * Build OpenAPI/serverless path elements from a base path and context.
 *
 * @param basePath - base path (e.g., 'users/:id')
 * @param context  - 'my' | 'private' | 'public' (public is unprefixed)
 * @returns array of path segments without leading/trailing slashes
 */
export const buildPathElements = (
  basePath: string,
  context: HttpContext,
): string[] => {
  const parts = splitPath(sanitizeBasePath(basePath));
  return context === 'public' ? parts : [context, ...parts];
};

export const sanitizeBasePath = (p: string): string => {
  // POSIX separators, trim slashes, and convert [param] -> {param}
  return p
    .replace(/\\/g, '/')
    .replace(/\[([^/]+?)\]/g, '{$1}')
    .replace(/^\/+|\/+$/g, '');
};
