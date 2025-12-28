import { existsSync, promises as fs } from 'node:fs';
import { join, posix, resolve, sep } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

import { copyDirWithConflicts } from './conflicts';
import { readJson, writeJson } from './fs';
import { detectPm, runInstall } from './install';
import { ensureToolkitDependency, mergeAdditive } from './manifest';
import { resolveTemplatesBase, toPosix } from './paths';
import {
  seedCliEntrypoint,
  seedGetDotenvScaffold,
  seedRegisterPlaceholders,
} from './seed';
import type { ConflictPolicy, InitOptions, InitResult } from './types';

const toPosixSep = (p: string): string => p.split(sep).join('/');
// Exclude dev-only type stubs (not meant for downstream apps).
const excludeDev = (rel: string): boolean => {
  const posixRel = rel.replace(/\\/g, '/');
  return /\/types\/[^/]*\.dev\.d\.ts$/i.test(posixRel);
};
const excludeTemplate = (rel: string): boolean => {
  const posixRel = rel.replace(/\\/g, '/');
  // Do not copy the template's dev tsconfig; downstream apps use
  // tsconfig.downstream.json (renamed to tsconfig.json) instead.
  if (posixRel === 'tsconfig.json') return true;
  // Do not copy the template's package.json; we always handle the manifest
  // via an additive merge (create when missing, never overwrite existing keys).
  // Copying would only trigger a scary/irrelevant conflict prompt.
  if (posixRel === 'package.json') return true;
  return excludeDev(rel);
};

export const runInit = async (
  root: string,
  template = 'default',
  opts?: InitOptions,
): Promise<InitResult> => {
  const created: string[] = [];
  const skipped: string[] = [];
  const examples: string[] = [];
  const merged: string[] = [];

  const optAll = opts ?? {};
  const templatesBase = resolveTemplatesBase();

  // Resolve template source: named template or filesystem path
  const templateIsPath =
    existsSync(template) && (await fs.stat(template)).isDirectory();
  const srcBase = templateIsPath
    ? resolve(template)
    : resolve(templatesBase, template);

  const projectBase = resolve(templatesBase, 'project');
  if (!existsSync(srcBase)) {
    throw new Error(
      `Template "${template}" not found (path or name). Tried: ${toPosix(srcBase)}.`,
    );
  }

  // 1) Copy shared project boilerplate
  if (existsSync(projectBase)) {
    const rl =
      optAll.yes === true
        ? undefined
        : createInterface({ input, output, terminal: true });
    let policy: ConflictPolicy;
    const c = optAll.conflict;
    if (c === 'overwrite' || c === 'example' || c === 'skip' || c === 'ask')
      policy = c;
    else policy = optAll.yes ? 'example' : 'ask';
    const copyOpts = rl
      ? ({ conflict: policy, rl } as const)
      : ({ conflict: policy } as const);
    await copyDirWithConflicts(projectBase, root, created, skipped, examples, {
      ...(copyOpts as object),
      exclude: excludeDev,
    } as never);
    rl?.close();
  }
  // 2) Copy selected template
  {
    const rl =
      optAll.yes === true
        ? undefined
        : createInterface({ input, output, terminal: true });
    let policy: ConflictPolicy;
    const c = optAll.conflict;
    if (c === 'overwrite' || c === 'example' || c === 'skip' || c === 'ask')
      policy = c;
    else policy = optAll.yes ? 'example' : 'ask';
    const copyOpts = rl
      ? ({ conflict: policy, rl } as const)
      : ({ conflict: policy } as const);
    await copyDirWithConflicts(srcBase, root, created, skipped, examples, {
      ...(copyOpts as object),
      exclude: excludeTemplate,
    } as never);
    rl?.close();
  }
  // 2.5) Convert template 'gitignore' into a real '.gitignore'
  try {
    const giSrc = join(root, 'gitignore');
    const giDot = join(root, '.gitignore');
    if (existsSync(giSrc)) {
      if (!existsSync(giDot)) {
        await fs.rename(giSrc, giDot);
        created.push(posix.normalize(giDot));
      } else {
        const example = join(root, 'gitignore.example');
        if (!existsSync(example)) {
          const data = await fs.readFile(giSrc, 'utf8');
          await fs.writeFile(example, data, 'utf8');
          examples.push(posix.normalize(example));
        }
        await fs.rm(giSrc, { force: true });
      }
    }
  } catch {
    // best-effort
  }

  // 2.6) Convert 'tsconfig.downstream.json' into 'tsconfig.json'
  try {
    const ds = join(root, 'tsconfig.downstream.json');
    const dst = join(root, 'tsconfig.json');
    if (existsSync(ds)) {
      if (!existsSync(dst)) {
        await fs.rename(ds, dst);
        created.push(posix.normalize(dst));
      } else {
        // If a tsconfig already exists, write an example and remove the source
        const example = join(root, 'tsconfig.json.example');
        if (!existsSync(example)) {
          const data = await fs.readFile(ds, 'utf8');
          await fs.writeFile(example, data, 'utf8');
          examples.push(posix.normalize(example));
        }
        await fs.rm(ds, { force: true });
      }
    }
  } catch {
    // best-effort
  }

  // Seed get-dotenv config scaffold (always).
  {
    const res = await seedGetDotenvScaffold(root);
    created.push(...res.created);
    skipped.push(...res.skipped);
  }

  // Seed app/generated/register.* placeholders
  {
    const res = await seedRegisterPlaceholders(root);
    created.push(...res.created);
    skipped.push(...res.skipped);
  }
  // 3) package.json presence (create when missing)
  const pkgPath = join(root, 'package.json');
  let pkg = await readJson<Record<string, unknown>>(pkgPath);
  if (!pkg) {
    const name = toPosixSep(root).split('/').pop() ?? 'smoz-app';
    pkg = {
      name,
      private: true,
      type: 'module',
      version: '0.0.0',
      scripts: {},
    };
    if (!optAll.dryRun) await writeJson(pkgPath, pkg);
    created.push(posix.normalize(pkgPath));
  }

  // Optional: seed a downstream local cli.ts entrypoint (tsx).
  if (optAll.cli) {
    const res = await seedCliEntrypoint(root);
    created.push(...res.created);
    skipped.push(...res.skipped);
  }

  // 4) Merge manifest additively (prefer template's embedded package.json)
  const templatePkgPath = resolve(srcBase, 'package.json');
  const manifest = existsSync(templatePkgPath)
    ? await readJson<Record<string, unknown>>(templatePkgPath)
    : await readJson<Record<string, unknown>>(
        resolve(templatesBase, '.manifests', `package.${template}.json`),
      );
  let pkgChanged = false;
  if (manifest) {
    const added = mergeAdditive(pkg, manifest);
    if (added.length > 0) {
      pkgChanged = true;
      merged.push(...added);
    }
  }

  // 4.5) Ensure runtime dependency on @karmaniverous/smoz is present
  {
    const injected = await ensureToolkitDependency(pkg, templatesBase);
    if (injected) {
      merged.push(injected);
      pkgChanged = true;
    }
  }
  if (!optAll.dryRun && pkgChanged) await writeJson(pkgPath, pkg);

  // 4.75) If --cli was selected, ensure a convenient script exists.
  if (optAll.cli) {
    const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
    const desired = 'tsx cli.ts';
    if (!scripts.cli) {
      scripts.cli = desired;
      merged.push('scripts:cli');
      pkgChanged = true;
    } else if (scripts.cli !== desired && !scripts['cli:smoz']) {
      scripts['cli:smoz'] = desired;
      merged.push('scripts:cli:smoz');
      pkgChanged = true;
    }
    pkg.scripts = scripts;
    if (!optAll.dryRun && pkgChanged) await writeJson(pkgPath, pkg);
  }

  // 5) Optional install
  let installed:
    | 'skipped'
    | 'ran (npm)'
    | 'ran (pnpm)'
    | 'ran (yarn)'
    | 'ran (bun)'
    | 'unknown-pm'
    | 'failed' = 'skipped';

  // Policy:
  // -y implies auto install unless --no-install
  const installOpt = optAll.install ?? false;
  const impliedAuto =
    optAll.yes === true && optAll.noInstall !== true && installOpt !== false;

  const hasInstallString =
    typeof installOpt === 'string' && installOpt.trim() !== '';
  const pm = hasInstallString
    ? installOpt
    : installOpt === true || impliedAuto
      ? detectPm(root)
      : undefined;

  installed = pm ? runInstall(root, pm) : installed;

  return { created, skipped, examples, merged, installed };
};
