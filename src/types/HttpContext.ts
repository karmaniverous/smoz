/** Security context classification used throughout the handlers. */
/**
 * HTTP security context tokens.
 */
export const httpContexts = ['my', 'private', 'public'] as const;
export type HttpContext = (typeof httpContexts)[number];
