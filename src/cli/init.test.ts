/* REQUIREMENTS ADDRESSED (TEST)
- CLI init: copies template files, seeds register placeholders, and reports
  install status without performing installs by default.
- The app's package.json gets @karmaniverous/get-dotenv ^8.0.0 as a
  devDependency, so the app's `smoz` bin runs (get-dotenv Decision 36).
*/
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runInit } from '@/src/cli/init';

describe('CLI: init', () => {
  it('copies template files, seeds register placeholders, and merges package manifest additively', async () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-init-'));
    try {
      const { created, examples, installed } = await runInit(root, 'default', {
        install: false,
        yes: true,
      });
      // Placeholders for registers exist
      const genDir = join(root, 'app', 'generated');
      expect(existsSync(join(genDir, 'register.functions.ts'))).toBe(true);
      expect(existsSync(join(genDir, 'register.openapi.ts'))).toBe(true);
      expect(existsSync(join(genDir, 'register.serverless.ts'))).toBe(true); // No install performed
      expect(
        installed === 'skipped' ||
          installed === 'failed' ||
          installed === 'unknown-pm',
      ).toBe(true);
      // Some files were created or examples produced
      expect(created.length + examples.length).toBeGreaterThan(0);
    } finally {
      // Clean temp sandbox
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('writes the get-dotenv ^8.0.0 devDependency the smoz bin needs', async () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-init-'));
    try {
      await runInit(root, 'default', { install: false, yes: true });
      const pkg = JSON.parse(
        readFileSync(join(root, 'package.json'), 'utf8'),
      ) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies?.['@karmaniverous/get-dotenv']).toBe('^8.0.0');
      expect(pkg.dependencies?.['@karmaniverous/get-dotenv']).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
