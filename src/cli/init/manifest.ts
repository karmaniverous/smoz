import { dirname, join } from 'node:path';

import { readJson } from './fs';

export const mergeAdditive = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): string[] => {
  const merged: string[] = [];
  const mergeKey = (
    key: 'dependencies' | 'devDependencies' | 'peerDependencies',
  ) => {
    const src = (source[key] as Record<string, string> | undefined) ?? {};
    const dst = (target[key] as Record<string, string> | undefined) ?? {};
    const out = { ...dst };
    let changed = false;
    for (const [k, v] of Object.entries(src)) {
      if (!(k in dst)) {
        out[k] = v;
        merged.push(`${key}:${k}@${v}`);
        changed = true;
      }
    }
    if (changed) {
      (target[key] as Record<string, string>) = out;
    }
  };
  mergeKey('dependencies');
  mergeKey('devDependencies');
  mergeKey('peerDependencies');

  const srcScripts =
    (source.scripts as Record<string, string> | undefined) ?? {};
  const dstScripts =
    (target.scripts as Record<string, string> | undefined) ?? {};
  const scriptsOut = { ...dstScripts };
  for (const [name, script] of Object.entries(srcScripts)) {
    if (!(name in dstScripts)) {
      scriptsOut[name] = script;
      merged.push(`scripts:${name}`);
    } else if (dstScripts[name] !== script) {
      const alias = `${name}:smoz`;
      if (!(alias in dstScripts)) {
        scriptsOut[alias] = script;
        merged.push(`scripts:${alias}`);
      }
    }
  }
  (target.scripts as Record<string, string>) = scriptsOut;
  return merged;
};

/**
 * Ensure a runtime dependency on `@karmaniverous/smoz` is present in the
 * target manifest, using a caret version derived from the toolkit package.
 * Returns the merge descriptor string when added, else undefined.
 */
export const ensureToolkitDependency = async (
  targetPkg: Record<string, unknown>,
  templatesBase: string,
): Promise<string | undefined> => {
  try {
    const toolkitRoot = dirname(templatesBase);
    const toolkitPkg = await readJson<Record<string, unknown>>(
      join(toolkitRoot, 'package.json'),
    );
    const verRaw = (toolkitPkg?.version as string | undefined)?.trim();
    const depVersion = verRaw ? `^${verRaw}` : '^0.0.0';
    const deps =
      (targetPkg.dependencies as Record<string, string> | undefined) ?? {};
    if (!deps['@karmaniverous/smoz']) {
      (targetPkg as { dependencies?: Record<string, string> }).dependencies ??=
        {};
      (targetPkg.dependencies as Record<string, string>)[
        '@karmaniverous/smoz'
      ] = depVersion;
      return `dependencies:@karmaniverous/smoz@${depVersion}`;
    }
  } catch {
    // best-effort; ignore
  }
  return undefined;
};
