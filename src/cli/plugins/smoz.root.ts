import { packageDirectorySync } from 'package-directory';

/**
 * Resolve the downstream repository root (best-effort) from current cwd.
 */
export const repoRoot = (): string => packageDirectorySync() ?? process.cwd();
