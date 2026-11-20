/**
 * SMOZ ESLint plugin: `@karmaniverous/smoz/eslint`.
 *
 * ```ts
 * import smoz from '@karmaniverous/smoz/eslint';
 *
 * export default [
 *   // ...
 *   {
 *     files: ['app/functions/**\/*.ts'],
 *     ignores: ['**\/*.test.ts'],
 *     plugins: { smoz },
 *     rules: { 'smoz/no-cross-function-imports': 'error' },
 *   },
 * ];
 * ```
 *
 * @packageDocumentation
 */
import type { ESLint } from 'eslint';

import { noCrossFunctionImports } from './eslint/noCrossFunctionImports';

export type { NoCrossFunctionImportsOptions } from './eslint/noCrossFunctionImports';

/** The SMOZ ESLint plugin. */
const plugin: ESLint.Plugin = {
  meta: { name: '@karmaniverous/smoz/eslint' },
  rules: { 'no-cross-function-imports': noCrossFunctionImports },
};

export default plugin;
