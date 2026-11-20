/**
 * Format generated sources with the project's own Prettier (#34).
 *
 * `smoz register` and `smoz add` format what they write. They load Prettier
 * from the project, the way `smoz openapi` finds its CLI, so a global or
 * npx-cached smoz formats with the app's Prettier version and config, or not
 * at all when the app has none.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { localPackageDir } from '@/src/cli/util/command';

/** The part of Prettier's API the CLI uses. */
interface PrettierApi {
  resolveConfig: (filePath: string) => Promise<Record<string, unknown> | null>;
  format: (source: string, options: Record<string, unknown>) => Promise<string>;
}

/**
 * Load Prettier as installed for the project at `root`, or undefined when it
 * isn't installed there.
 *
 * @param root - project root
 */
export const loadProjectPrettier = async (
  root: string,
): Promise<PrettierApi | undefined> => {
  const dir = localPackageDir(root, 'prettier');
  if (!dir) return undefined;
  try {
    // Resolve the entry through the package's own exports (self-reference).
    const entry = createRequire(path.join(dir, 'package.json')).resolve(
      'prettier',
    );
    return (await import(pathToFileURL(entry).href)) as PrettierApi;
  } catch {
    return undefined;
  }
};

/**
 * Format `source` as the file at `filePath`, with the project's Prettier and
 * the config that applies to that file. Returns `source` unchanged when the
 * project has no Prettier or formatting fails.
 *
 * @param root - project root
 * @param filePath - absolute path of the file being written (selects parser and config)
 * @param source - the file's content
 */
export const formatWithProjectPrettier = async (
  root: string,
  filePath: string,
  source: string,
): Promise<string> => {
  const prettier = await loadProjectPrettier(root);
  if (!prettier) return source;
  try {
    // resolveConfig searches upward from the file's own directory.
    const config = (await prettier.resolveConfig(filePath)) ?? {};
    return await prettier.format(source, { ...config, filepath: filePath });
  } catch {
    return source;
  }
};
