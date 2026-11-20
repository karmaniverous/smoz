import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import eslint from '@eslint/js';
import smoz from '@karmaniverous/smoz/eslint';
import vitestPlugin from '@vitest/eslint-plugin';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tsdocPlugin from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

/**
 * Every TypeScript file is linted with full type information: the project
 * service gives each file the nearest `tsconfig.json`.
 */
export default defineConfig(
  {
    ignores: [
      '.serverless/**',
      '**/.tsbuild/**',
      '**/generated/**',
      'coverage/**',
      'dist/**',
      'docs/**',
      'node_modules/**',
    ],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir },
    },
    plugins: {
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSortPlugin,
      tsdoc: tsdocPlugin,
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      'prettier/prettier': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'tsdoc/syntax': 'warn',
    },
  },
  {
    // A function never imports another function's modules: bundled into the
    // importer, its lambda.ts would derive its options from the wrong folder.
    files: ['app/functions/**/*.ts'],
    ignores: ['**/*.test.ts'],
    plugins: { smoz },
    rules: { 'smoz/no-cross-function-imports': 'error' },
  },
  {
    files: ['**/*.test.ts'],
    plugins: { vitest: vitestPlugin },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      // Type assertions (expectTypeOf) are assertions too.
      'vitest/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'expectTypeOf'] },
      ],
    },
  },
  prettierConfig,
);
