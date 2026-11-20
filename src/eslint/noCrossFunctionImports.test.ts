/* REQUIREMENTS ADDRESSED (TEST)
- #42/#43: smoz/no-cross-function-imports flags a function module importing
  another function's modules, by relative path, alias, re-export or dynamic
  import; never flags a function's own modules (by any path), packages, shared
  app modules, type-only imports or files outside app/functions.
*/
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';

import plugin from '@/src/eslint';

import { functionDirOf } from './noCrossFunctionImports';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// A real app on disk: the rule finds function folders by their lambda.ts.
const root = mkdtempSync(path.join(tmpdir(), 'smoz-eslint-'));
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});
const touch = (rel: string) => {
  const p = path.join(root, rel);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, '');
  return p;
};
touch('package.json');
touch('app/functions/rest/users/get/lambda.ts');
const getHandler = touch('app/functions/rest/users/get/handler.ts');
const getHelper = touch('app/functions/rest/users/get/helpers/format.ts');
touch('app/functions/rest/users/post/lambda.ts');
touch('app/functions/sqs/tick/lambda.ts');
const tickHandler = touch('app/functions/sqs/tick/handler.ts');
const shared = touch('app/shared/util.ts');

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser },
});
const rule = plugin.rules?.['no-cross-function-imports'];
if (!rule || typeof rule === 'function') throw new Error('rule missing');

const crossFunction = (spec: string, own: string, theirs: string) => ({
  messageId: 'crossFunction',
  data: { spec, own, theirs },
});

ruleTester.run('no-cross-function-imports', rule, {
  valid: [
    { filename: getHandler, code: "import { fn } from './lambda';" },
    {
      filename: getHandler,
      code: "import { fn } from '@/app/functions/rest/users/get/lambda';",
    },
    { filename: getHelper, code: "import { fn } from '../lambda';" },
    { filename: getHandler, code: "import { z } from 'zod';" },
    { filename: getHandler, code: "import { x } from '@/app/shared/util';" },
    // Erased at build time.
    { filename: getHandler, code: "import type { R } from '../post/lambda';" },
    { filename: getHandler, code: "import { type R } from '../post/lambda';" },
    { filename: getHandler, code: "export type { R } from '../post/lambda';" },
    // Only function modules are checked.
    {
      filename: shared,
      code: "import { fn } from '@/app/functions/rest/users/get/lambda';",
    },
  ],
  invalid: [
    {
      filename: tickHandler,
      code: "import { handler } from '@/app/functions/rest/users/get/handler';",
      errors: [
        crossFunction(
          '@/app/functions/rest/users/get/handler',
          'sqs/tick',
          'rest/users/get',
        ),
      ],
    },
    {
      filename: getHandler,
      code: "import { fn } from '../post/lambda';",
      errors: [
        crossFunction('../post/lambda', 'rest/users/get', 'rest/users/post'),
      ],
    },
    {
      filename: getHelper,
      code: "import { fn } from '../../post';",
      errors: [
        crossFunction('../../post', 'rest/users/get', 'rest/users/post'),
      ],
    },
    {
      filename: getHandler,
      code: "export * from '../post/lambda';",
      errors: [
        crossFunction('../post/lambda', 'rest/users/get', 'rest/users/post'),
      ],
    },
    {
      filename: getHandler,
      code: "export { fn } from '../post/lambda';",
      errors: [
        crossFunction('../post/lambda', 'rest/users/get', 'rest/users/post'),
      ],
    },
    {
      filename: getHandler,
      code: "const m = await import('../post/lambda');",
      errors: [
        crossFunction('../post/lambda', 'rest/users/get', 'rest/users/post'),
      ],
    },
    {
      filename: getHandler,
      code: "import { fn } from '~/functions/sqs/tick/lambda';",
      options: [{ alias: { '~/': 'app' } }],
      errors: [
        crossFunction(
          '~/functions/sqs/tick/lambda',
          'rest/users/get',
          'sqs/tick',
        ),
      ],
    },
  ],
});

describe('functionDirOf', () => {
  it('stops at the functions folder', ({ expect }) => {
    expect(functionDirOf(path.join(root, 'app/functions/rest'))).toBe(
      undefined,
    );
    expect(functionDirOf(path.join(root, 'app/shared'))).toBe(undefined);
    expect(
      functionDirOf(path.join(root, 'app/functions/rest/users/get/helpers')),
    ).toBe(path.join(root, 'app/functions/rest/users/get'));
  });
});
