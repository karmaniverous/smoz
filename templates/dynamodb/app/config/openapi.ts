import fs from 'fs-extra';
import { packageDirectorySync } from 'package-directory';
import path from 'path';
import { createDocument } from 'zod-openapi';

import { app } from '@/app/config/app.config';
/**
 * Template note:
 * - Templates do NOT commit generated register files under app/generated; they
 *   are declared via ambient types (templates/default/types/registers.d.ts) so
 *   TypeScript can typecheck without artifacts.
 * - To ensure side effects still run (endpoint registration) and to satisfy
 *   noUncheckedSideEffectImports, import the register module as a namespace and
 *   reference it via `void`. * - In real apps, `smoz init` seeds placeholders and `smoz register` rewrites
 *   app/generated/register.*.ts at author time.
 */
import * as __register_openapi from '@/app/generated/register.openapi';
void __register_openapi;
console.log('Generating OpenAPI document...');

const paths = app.buildAllOpenApiPaths();
export const doc = createDocument({
  openapi: '3.1.0',
  servers: [
    { description: 'Production', url: 'https://api.example.test' },
    { description: 'Dev', url: 'https://api.dev.example.test' },
  ],
  info: {
    title: process.env.npm_package_name ?? '',
    version: process.env.npm_package_version ?? '',
  },
  paths,
});

const pkgDir = packageDirectorySync();
if (!pkgDir) throw new Error('Could not find package root directory');

const outDir = path.join(pkgDir, 'app', 'generated');
fs.ensureDirSync(outDir);
fs.writeFileSync(
  path.join(outDir, 'openapi.json'),
  JSON.stringify(doc, null, 2),
);

console.log('Done!');
