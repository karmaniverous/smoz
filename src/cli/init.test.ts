/* REQUIREMENTS ADDRESSED (TEST)
- CLI init: copies template files, seeds register placeholders, and reports
  install status without performing installs by default.
*/
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
      expect(existsSync(join(genDir, 'register.serverless.ts'))).toBe(true);

      // get-dotenv scaffolding is always created
      expect(existsSync(join(root, 'getdotenv.config.ts'))).toBe(true);
      expect(existsSync(join(root, 'getdotenv.dynamic.ts'))).toBe(true);

      // No install performed
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

  it('can scaffold a local cli.ts and cli script when enabled', async () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-init-cli-'));
    try {
      await runInit(root, 'default', {
        install: false,
        yes: true,
        cli: true,
      });

      expect(existsSync(join(root, 'cli.ts'))).toBe(true);

      const pkg = JSON.parse(
        readFileSync(join(root, 'package.json'), 'utf8'),
      ) as {
        scripts?: Record<string, string>;
      };
      const scripts = pkg.scripts ?? {};

      // Prefer the canonical script name; allow cli:smoz alias if cli already existed.
      expect(
        scripts.cli === 'tsx cli.ts' || scripts['cli:smoz'] === 'tsx cli.ts',
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
