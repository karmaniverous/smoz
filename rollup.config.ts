/* See <stanPath>/system/stan.project.md for global requirements.
 * Requirements addressed:
 * - Minimal library bundling: ESM + CJS outputs.
 * - Generate a single type declarations bundle at dist/index.d.ts.
 * - Keep runtime dependencies and Node built-ins external.
 * - Resolve TS path alias "@/..." to real sources for published outputs.
 */
import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import alias from '@rollup/plugin-alias';
import typescriptPlugin from '@rollup/plugin-typescript';
import type {
  InputOptions,
  OutputOptions,
  Plugin,
  RollupLog,
  RollupOptions,
} from 'rollup';
import dtsPlugin from 'rollup-plugin-dts';
const outputPath = 'dist';

// Multi-entry mapping to produce subpath bundles for JS and DTS.
const entryPoints = {
  index: 'src/index.ts',
  // Programmatic CLI composition helpers (not the bin entry).
  cli: 'src/cli/public.ts',
  // Serverless plugin entry (CJS/ESM build + DTS). The plugin is intended to be
  // loaded via CJS by Serverless; we still emit both formats for completeness.
  'serverless-plugin': 'src/serverless/plugin.ts',
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve TS path alias "@/..." -> "<repo>/..."
const aliasPlugin = alias({
  entries: [{ find: /^@\//, replacement: path.resolve(__dirname) + '/' }],
});

// Collect runtime dependency names (dependencies + peerDependencies) to mark as external.
let runtimeExternalPkgs = new Set<string>();
try {
  const pkgJsonText = readFileSync(
    path.resolve(__dirname, 'package.json'),
    'utf8',
  );
  const parsedUnknown: unknown = JSON.parse(pkgJsonText);
  if (typeof parsedUnknown === 'object' && parsedUnknown !== null) {
    const deps =
      (parsedUnknown as { dependencies?: Record<string, string> })
        .dependencies ?? {};
    const peers =
      (parsedUnknown as { peerDependencies?: Record<string, string> })
        .peerDependencies ?? {};
    runtimeExternalPkgs = new Set<string>([
      ...Object.keys(deps),
      ...Object.keys(peers),
    ]);
  }
} catch {
  // noop — external set stays empty
}

// Treat Node built-ins and node: specifiers as external.
const nodeExternals = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

const makePlugins = (tsconfigPath?: string): Plugin[] => [
  aliasPlugin,
  typescriptPlugin({
    // Do not write transpiled output to disk; let Rollup handle bundling.
    outputToFilesystem: false,
    // Allow a custom tsconfig for specialized builds (e.g., stan:build).
    tsconfig: tsconfigPath ?? false,
    // Override conflicting tsconfig flags for bundling. Declarations are produced by rollup-plugin-dts.
    compilerOptions: {
      declaration: false,
      emitDeclarationOnly: false,
      noEmit: false,
      sourceMap: false,
      // outDir intentionally not set here; provided by custom tsconfig when needed.
    },
  }),
];

const commonInputOptions = (tsconfigPath?: string): InputOptions => ({
  plugins: makePlugins(tsconfigPath),
  onwarn(warning: RollupLog, defaultHandler: (w: RollupLog) => void) {
    // Alias resolves "@/..." to real paths; no special suppression needed.
    defaultHandler(warning);
  },
  external: (id) =>
    // Optional formatter used via dynamic import in the CLI; do not bundle.
    id === 'prettier' ||
    nodeExternals.has(id) ||
    Array.from(runtimeExternalPkgs).some(
      (p) => id === p || id.startsWith(`${p}/`),
    ),
});
const outCommon = (dest: string): OutputOptions[] => [
  { dir: `${dest}/mjs`, format: 'esm', sourcemap: false },
  { dir: `${dest}/cjs`, format: 'cjs', sourcemap: false },
];

export const buildLibrary = (
  dest: string,
  tsconfigPath?: string,
): RollupOptions => ({
  input: entryPoints,
  output: outCommon(dest),
  ...commonInputOptions(tsconfigPath),
});

export const buildTypes = (dest: string): RollupOptions => ({
  input: entryPoints,
  // Emit declaration files for all entry points at `dist/`, producing:
  // - dist/index.d.ts
  // - dist/mutators/orval.d.ts
  // - dist/mutators/index.d.ts
  output: { dir: dest, format: 'es' },
  // Treat known externals explicitly as external during the DTS pass
  // to avoid "Unresolved dependencies" warnings. The dts plugin will inline
  // what it can based on the provided paths mapping.
  external: (id) =>
    nodeExternals.has(id) ||
    Array.from(runtimeExternalPkgs).some(
      (p) => id === p || id.startsWith(`${p}/`),
    ),
  plugins: [
    dtsPlugin({
      // Help the DTS bundler resolve our alias imports so it can inline types
      // instead of leaving unresolved "@/" references.
      compilerOptions: {
        baseUrl: '.',
        paths: { '@/*': ['*'] },
      },
    }),
  ],
  // Keep warnings visible; no alias suppression needed with proper paths config.
  onwarn(warning: RollupLog, defaultHandler: (w: RollupLog) => void) {
    defaultHandler(warning);
  },
});
/**
 * Inline server build (ESM only).
 * - Output: dist/mjs/cli/inline-server.js
 * - Externalization: reuse commonInputOptions to keep built-ins/deps external.
 */
export const buildInlineServer = (
  dest: string,
  tsconfigPath?: string,
): RollupOptions => ({
  input: 'src/cli/local/inline.server/index.ts',
  output: {
    file: `${dest}/mjs/cli/inline-server.js`,
    format: 'esm',
    sourcemap: false,
  },
  ...commonInputOptions(tsconfigPath),
});
/**
 * CLI build (CJS bin with shebang).
 * - Output: dist/cli/index.cjs
 * - Externalization: reuse commonInputOptions to keep built-ins/deps external. */
export const buildCli = (
  dest: string,
  tsconfigPath?: string,
): RollupOptions => ({
  input: 'src/cli/index.ts',
  output: {
    file: `${dest}/cli/index.cjs`,
    format: 'cjs',
    banner: '#!/usr/bin/env node',
    sourcemap: false,
  },
  ...commonInputOptions(tsconfigPath),
});

export default [
  buildLibrary(outputPath, 'tsconfig.rollup.json'),
  buildTypes(outputPath),
  buildCli(outputPath, 'tsconfig.rollup.json'),
  buildInlineServer(outputPath, 'tsconfig.rollup.json'),
];
