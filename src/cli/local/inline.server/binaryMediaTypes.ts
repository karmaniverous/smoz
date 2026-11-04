/**
 * API Gateway binary media types for the inline dev server.
 *
 * A deployed REST API base64-encodes a request body (and sets
 * `isBase64Encoded: true`) when the request's Content-Type matches one of the
 * API's `binaryMediaTypes`; otherwise the body reaches Lambda as UTF-8 text.
 * The inline server applies the same rule so uploads behave in dev as they do
 * when deployed.
 */

/**
 * Used when the app's `serverless.ts` is missing or fails to load: the common
 * upload types, so file uploads work in dev without configuration.
 */
export const DEFAULT_BINARY_MEDIA_TYPES: readonly string[] = [
  'multipart/form-data',
  'image/*',
  'application/octet-stream',
];

/** Lower-cased `type/subtype` of a media type, without parameters. */
const essence = (mediaType: string): string =>
  (mediaType.split(';')[0] ?? '').trim().toLowerCase();

/** Whether a `type/subtype` pattern part matches (`*` matches anything). */
const partMatches = (pattern: string, value: string): boolean =>
  pattern === '*' || pattern === value;

/**
 * Whether a request Content-Type matches any of the binary media types.
 * Matching ignores case and parameters (`; boundary=...`). A `*` type or
 * subtype matches any value, as in `image/*` or a catch-all of `*` for both.
 */
export const isBinaryMediaType = (
  contentType: string | undefined,
  binaryMediaTypes: readonly string[],
): boolean => {
  if (!contentType) return false;
  const [type, subtype] = essence(contentType).split('/');
  if (!type || !subtype) return false;
  return binaryMediaTypes.some((t) => {
    const [pType = '', pSubtype = ''] = essence(t).split('/');
    return partMatches(pType, type) && partMatches(pSubtype, subtype);
  });
};

/**
 * `provider.apiGateway.binaryMediaTypes` of a serverless config, or `[]` when
 * it sets none (API Gateway then treats every body as text).
 */
export const binaryMediaTypesOf = (config: unknown): string[] => {
  const types = (
    config as
      { provider?: { apiGateway?: { binaryMediaTypes?: unknown } } } | undefined
  )?.provider?.apiGateway?.binaryMediaTypes;
  return Array.isArray(types)
    ? types.filter((t): t is string => typeof t === 'string')
    : [];
};
