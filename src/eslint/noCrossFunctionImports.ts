/**
 * ESLint rule `smoz/no-cross-function-imports` (#42, #43).
 *
 * A function's modules must not import another function's modules. Bundled
 * into the importing function, the imported `lambda.ts` runs
 * `app.defineFunction` with the importer's `import.meta.url`, so smoz derives
 * its event type, endpoints root and name from the wrong folder: it registers
 * wrongly, or throws at cold start. Unit tests import from source, where the
 * path is right, so only this check catches it before deploy.
 *
 * A file belongs to the function whose folder is its nearest ancestor holding
 * a `lambda.ts`, searching up to the enclosing `functions` folder. Imports are
 * resolved to files (relative paths and path aliases), so a function importing
 * its own modules, by any path, is never flagged. Type-only imports are
 * erased at build time and are allowed.
 *
 * @packageDocumentation
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import type { Rule } from 'eslint';

/** Rule options. */
export interface NoCrossFunctionImportsOptions {
  /**
   * Path alias prefixes and the directories they map to, e.g.
   * `{ '@/': '/abs/project/' }`. Relative directories resolve against the
   * linted file's package root. Defaults to `{ '@/': <package root> }`, the
   * template's `@/*` alias, where the package root is the nearest directory
   * above the file with a `package.json`.
   */
  alias?: Record<string, string>;
}

const isDir = (p: string): boolean => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

/** Nearest directory at or above `dir` with a package.json. */
const packageRootOf = (dir: string): string | undefined => {
  for (let d = dir; ; d = path.dirname(d)) {
    if (existsSync(path.join(d, 'package.json'))) return d;
    if (path.dirname(d) === d) return undefined;
  }
};

/**
 * The function folder `dir` lies in: its nearest ancestor (or itself) holding
 * a `lambda.ts`, searching up to the enclosing `functions` folder. Undefined
 * outside any function.
 */
export const functionDirOf = (dir: string): string | undefined => {
  for (let d = dir; ; d = path.dirname(d)) {
    if (path.basename(d) === 'functions') return undefined;
    if (existsSync(path.join(d, 'lambda.ts'))) return d;
    if (path.dirname(d) === d) return undefined;
  }
};

/** A function folder as shown in messages: relative to its `functions` folder. */
const labelOf = (fnDir: string): string => {
  let d = fnDir;
  while (path.basename(d) !== 'functions' && path.dirname(d) !== d)
    d = path.dirname(d);
  return path.relative(d, fnDir).split(path.sep).join('/');
};

/** Absolute target of an import specifier, or undefined for packages. */
const resolveSpecifier = (
  fromDir: string,
  spec: string,
  alias: Record<string, string>,
): string | undefined => {
  if (spec.startsWith('./') || spec.startsWith('../') || spec === '..')
    return path.resolve(fromDir, spec);
  for (const [prefix, target] of Object.entries(alias))
    if (spec.startsWith(prefix))
      return path.resolve(target, spec.slice(prefix.length));
  return undefined;
};

/** The directory an import lands in: the target itself if it is one. */
const targetDirOf = (target: string): string =>
  isDir(target) ? target : path.dirname(target);

type ImportNode =
  | {
      type: 'ImportDeclaration';
      importKind?: string;
      source: unknown;
      specifiers: { importKind?: string }[];
    }
  | {
      type: 'ExportNamedDeclaration' | 'ExportAllDeclaration';
      exportKind?: string;
      source?: unknown;
    }
  | { type: 'ImportExpression'; source: unknown };

/** True for imports erased at build time (`import type`, all-type specifiers). */
const isTypeOnly = (node: ImportNode): boolean => {
  if (node.type === 'ImportDeclaration')
    return (
      node.importKind === 'type' ||
      (node.specifiers.length > 0 &&
        node.specifiers.every((s) => s.importKind === 'type'))
    );
  if (node.type === 'ImportExpression') return false;
  return node.exportKind === 'type';
};

const literal = (source: unknown): string | undefined => {
  const s = source as { type?: string; value?: unknown } | null | undefined;
  return s?.type === 'Literal' && typeof s.value === 'string'
    ? s.value
    : undefined;
};

export const noCrossFunctionImports: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow importing another function's modules (its lambda.ts would derive its options from the importer's folder)",
      url: 'https://github.com/karmaniverous/smoz/blob/main/docs-src/recipes/project-structure.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          alias: { type: 'object', additionalProperties: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      crossFunction:
        "'{{spec}}' is in function '{{theirs}}', not this one ('{{own}}'). Bundled into this function, that function's lambda.ts would derive its options from this folder. Move the shared code to a module outside app/functions.",
    },
  },
  create(context) {
    const file = context.filename;
    if (!path.isAbsolute(file)) return {};
    const fromDir = path.dirname(file);
    const own = functionDirOf(fromDir);
    if (!own) return {};

    const options = (context.options[0] ?? {}) as NoCrossFunctionImportsOptions;
    const pkgRoot = packageRootOf(fromDir) ?? fromDir;
    const alias = Object.fromEntries(
      Object.entries(options.alias ?? { '@/': '.' }).map(([k, v]) => [
        k,
        path.resolve(pkgRoot, v),
      ]),
    );

    const check = (node: ImportNode) => {
      const spec = literal(node.source);
      if (spec === undefined || isTypeOnly(node)) return;
      const target = resolveSpecifier(fromDir, spec, alias);
      if (!target) return;
      const theirs = functionDirOf(targetDirOf(target));
      if (!theirs || theirs === own) return;
      context.report({
        node: node as unknown as Rule.Node,
        messageId: 'crossFunction',
        data: { spec, own: labelOf(own), theirs: labelOf(theirs) },
      });
    };

    return {
      ImportDeclaration: (node) => {
        check(node as unknown as ImportNode);
      },
      ExportNamedDeclaration: (node) => {
        check(node);
      },
      ExportAllDeclaration: (node) => {
        check(node);
      },
      ImportExpression: (node) => {
        check(node);
      },
    };
  },
};
