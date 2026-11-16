/* REQUIREMENTS ADDRESSED (TEST)
- #33: `smoz --help` and `smoz -V` report smoz's own version and description
  (get-dotenv's host identity, `importMetaUrl`), not get-dotenv's.
*/
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  repoRoot,
  type RunResult,
  runSmozFromSource,
} from '@/src/test/cliBaseline';

const pkg = JSON.parse(
  readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
) as { version: string; description: string };

let help: RunResult;
let version: RunResult;

beforeAll(async () => {
  [help, version] = await Promise.all([
    runSmozFromSource(['--help']),
    runSmozFromSource(['-V']),
  ]);
}, 120_000);

describe('smoz identity (#33)', () => {
  it('-V prints smoz version', () => {
    expect(version.code).toBe(0);
    expect(version.stdout.trim()).toBe(pkg.version);
  });

  it('--help shows smoz version and description', () => {
    expect(help.code).toBe(0);
    const lines = help.stdout.split(/\r?\n/).map((l) => l.trim());
    expect(lines).toContain(`smoz v${pkg.version}`);
    expect(lines).toContain(pkg.description);
  });
});
