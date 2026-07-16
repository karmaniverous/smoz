import { type HttpContext, httpContexts } from '@/src/types/HttpContext';

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

export const sanitizeBasePath = (p: string): string =>
  p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

/**
 * Infer the security context from a path that was built by
 * `buildPathElements`. Non-public contexts appear as the first
 * path segment; public paths have no context prefix.
 */
export const inferContextFromPath = (path: string): HttpContext => {
  const firstSeg = splitPath(sanitizeBasePath(path))[0];
  return firstSeg !== undefined &&
    (httpContexts as readonly string[]).includes(firstSeg) &&
    firstSeg !== 'public'
    ? (firstSeg as HttpContext)
    : 'public';
};
