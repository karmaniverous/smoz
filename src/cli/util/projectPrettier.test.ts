/* REQUIREMENTS ADDRESSED (TEST)
- #34: register and add format with the project's own Prettier (found from the
  project root like Node does, never smoz's own copy), and write sources
  unformatted when the project has none.
*/
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runAdd } from '@/src/cli/add';
import { runRegister } from '@/src/cli/register';
import { localPackageDir } from '@/src/cli/util/command';
import { formatWithProjectPrettier } from '@/src/cli/util/projectPrettier';

const roots: string[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'smoz-prettier-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), '{"name":"app"}');
  return root;
};

/**
 * Install a fake prettier in `root` that stamps what it formats. Laid out like
 * Prettier 3: a CommonJS build under the `require` condition, ESM otherwise.
 */
const installFakePrettier = (root: string) => {
  const dir = join(root, 'node_modules', 'prettier');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'prettier',
      exports: { '.': { require: './index.cjs', default: './index.mjs' } },
    }),
  );
  const api = [
    'const resolveConfig = async () => ({ stamp: "project" });',
    'const format = async (s, o) => `// ${o.stamp} prettier\\n${s}`;',
  ].join('\n');
  writeFileSync(
    join(dir, 'index.cjs'),
    `${api}\n// Built like Prettier's: no named exports an ESM import can see.\nmodule.exports = Object.assign({}, { resolveConfig, format });\n`,
  );
  writeFileSync(
    join(dir, 'index.mjs'),
    `${api}\nexport { resolveConfig, format };\n`,
  );
};

/** Prettier installed above the temp dir (e.g. ~/node_modules) would be found. */
const prettierAboveTmp = localPackageDir(tmpdir(), 'prettier') !== undefined;

describe('project Prettier (#34)', () => {
  it("formats with the project's own Prettier and its config", async () => {
    const root = tempRoot();
    installFakePrettier(root);
    expect(await formatWithProjectPrettier(root, join(root, 'a.ts'), 'x')).toBe(
      '// project prettier\nx',
    );
  });

  it('smoz add and smoz register use it', async () => {
    const root = tempRoot();
    installFakePrettier(root);
    await runAdd(root, 'sqs/tick');
    await runRegister(root);
    for (const file of [
      'app/functions/sqs/tick/lambda.ts',
      'app/generated/register.functions.ts',
    ]) {
      const body = readFileSync(join(root, file), 'utf8');
      expect(body.startsWith('// project prettier\n')).toBe(true);
    }
  });

  it.skipIf(prettierAboveTmp)(
    "leaves sources unformatted when the project has no Prettier (never smoz's own)",
    async () => {
      const root = tempRoot();
      expect(
        await formatWithProjectPrettier(root, join(root, 'a.ts'), 'const  x=1'),
      ).toBe('const  x=1');
    },
  );
});
