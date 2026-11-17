/* REQUIREMENTS ADDRESSED (TEST)
- Validate CLI register: generates stable, POSIX-sorted side-effect imports,
  idempotent rewrites, and presence of expected import lines.
*/
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runRegister } from '@/src/cli/register';

describe('CLI: register', () => {
  const makeSandbox = () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-reg-'));
    // Minimal author layout: app/functions/rest/hello/get/{lambda,openapi}.ts
    const base = join(root, 'app', 'functions', 'rest', 'hello', 'get');
    mkdirSync(base, { recursive: true });
    writeFileSync(join(base, 'lambda.ts'), 'export {};', 'utf8');
    writeFileSync(join(base, 'openapi.ts'), 'export {};', 'utf8');
    return root;
  };

  it('generates stable, POSIX-sorted imports and is idempotent', async () => {
    const root = makeSandbox();
    try {
      writeFileSync(
        join(root, '.prettierrc.json'),
        JSON.stringify({ singleQuote: true }),
        'utf8',
      );
      // First run creates/generated register files
      const first = await runRegister(root);
      expect(first.wrote.length).toBeGreaterThan(0);

      // Content checks
      const genDir = join(root, 'app', 'generated');
      const fnsPath = join(genDir, 'register.functions.ts');
      const oaiPath = join(genDir, 'register.openapi.ts');
      expect(existsSync(fnsPath)).toBe(true);
      expect(existsSync(oaiPath)).toBe(true);

      const fns = readFileSync(fnsPath, 'utf8');
      const oai = readFileSync(oaiPath, 'utf8');
      // POSIX-form imports and stable substrings
      // Relative from app/generated → app/functions/...
      expect(fns).toContain("import '../functions/rest/hello/get/lambda';");
      expect(oai).toContain("import '../functions/rest/hello/get/openapi';");
      // Second run: No changes
      const second = await runRegister(root);
      expect(second.wrote.length).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
