/* REQUIREMENTS ADDRESSED (TEST)
- CLI add: scaffolds HTTP and non-HTTP trees idempotently with expected files.
*/
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runAdd } from '@/src/cli/add';

/**
 * Fields defineFunction derives from the folder or functionDefaults, so the
 * scaffold doesn't write them. `eventType` derives too, but is written as a
 * literal because only a literal types the handler's event (#39 D1).
 */
const derivable =
  /method:|basePath|contentType|httpContexts|endpointsRootAbs|functionName|APP_ROOT_ABS|node:path/;

/** Read a scaffolded file. */
const read = (dir: string, file: string) =>
  readFileSync(join(dir, file), 'utf8');

/** The handler stub keeps defineFunction's inference: no casts. */
const expectUncastHandler = (dir: string) => {
  const body = read(dir, 'handler.ts');
  expect(body).toMatch(/fn\.handler\(/);
  expect(body).not.toMatch(/\bas\b\s+(unknown|Response|any)\b/);
};

describe('CLI: add', () => {
  it.each([
    [{ singleQuote: true }, "eventType: 'rest'"],
    [{ singleQuote: false }, 'eventType: "rest"'],
  ])(
    "formats with the app's own Prettier config (%o)",
    async (config, expected) => {
      const root = mkdtempSync(join(tmpdir(), 'smoz-add-prettier-'));
      try {
        // The app's own Prettier: link the real one into its node_modules.
        mkdirSync(join(root, 'node_modules'));
        symlinkSync(
          join(process.cwd(), 'node_modules', 'prettier'),
          join(root, 'node_modules', 'prettier'),
          'junction',
        );
        writeFileSync(join(root, '.prettierrc.json'), JSON.stringify(config));
        await runAdd(root, 'rest/q/get');
        const dir = join(root, 'app', 'functions', 'rest', 'q', 'get');
        expect(read(dir, 'lambda.ts')).toContain(expected);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it('accepts :id, {id} and [id] as the same path parameter', async () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-add-params-'));
    try {
      const created = await Promise.all(
        ['rest/a/:id/get', 'rest/b/{id}/get', 'rest/c/[id]/get'].map(
          async (spec) => (await runAdd(root, spec)).created.length,
        ),
      );
      expect(created).toEqual([3, 3, 3]);
      for (const seg of ['a', 'b', 'c']) {
        const body = readFileSync(
          join(
            root,
            'app',
            'functions',
            'rest',
            seg,
            '[id]',
            'get',
            'lambda.ts',
          ),
          'utf8',
        );
        // Prettier may pick either quote style in a bare temp root.
        expect(body).toMatch(new RegExp(`basePath: (['"])${seg}/\\{id\\}\\1`));
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects a spec without a path segment', async () => {
    await expect(runAdd(tmpdir(), 'rest')).rejects.toThrow(/Invalid spec/);
    await expect(runAdd(tmpdir(), 'rest/get')).rejects.toThrow(
      /at least one path segment/,
    );
  });

  it('scaffolds HTTP and non-HTTP trees and is idempotent', async () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-add-'));
    try {
      // HTTP example
      const http = await runAdd(root, 'rest/foo/get');
      expect(http.created.length).toBeGreaterThan(0);
      // Verify some files exist
      const httpBase = join(root, 'app', 'functions', 'rest', 'foo', 'get');
      expect(existsSync(join(httpBase, 'lambda.ts'))).toBe(true);
      expect(existsSync(join(httpBase, 'handler.ts'))).toBe(true);
      expect(existsSync(join(httpBase, 'openapi.ts'))).toBe(true);
      // Only real overrides are written; everything else is derived.
      const httpLambda = readFileSync(join(httpBase, 'lambda.ts'), 'utf8');
      expect(httpLambda).not.toMatch(derivable);
      expect(httpLambda).toMatch(/callerModuleUrl: import\.meta\.url/);
      expect(httpLambda).toMatch(/Registration: GET \/foo\n/);
      expect(httpLambda).toMatch(/eventType: (['"])rest\1/);
      expectUncastHandler(httpBase);
      // Second run should skip the same files
      const http2 = await runAdd(root, 'rest/foo/get');
      expect(http2.created.length).toBe(0);
      expect(http2.skipped.length).toBeGreaterThanOrEqual(1);

      // Path parameter example (accepts :id form; writes [id] dir; emits {id} in code/docs)
      // Created/skipped counts are not asserted here; the artifacts are.
      await runAdd(root, 'rest/users/:id/get');
      const ppBase = join(
        root,
        'app',
        'functions',
        'rest',
        'users',
        '[id]',
        'get',
      );
      expect(existsSync(ppBase)).toBe(true);
      // lambda.ts: basePath uses {id}
      const lambdaBody = readFileSync(join(ppBase, 'lambda.ts'), 'utf8');
      // basePath stays: the derived one would be the folder path users/[id].
      expect(lambdaBody).toMatch(/basePath:\s*(['"])users\/\{id\}\1/);
      expect(lambdaBody.replace(/basePath/g, '')).not.toMatch(derivable);
      // openapi.ts: parameters entry and Path template hint
      const oaiBody = readFileSync(join(ppBase, 'openapi.ts'), 'utf8');
      // Path template hint
      expect(oaiBody).toMatch(/Path template:\s*\/users\/\{id\}/);
      // Parameters array contains id in: path
      expect(oaiBody).toMatch(
        /\{\s*name:\s*['"]id['"],\s*in:\s*['"]path['"],\s*required:\s*true,\s*schema:\s*\{\s*type:\s*['"]string['"]\s*\}/,
      );
      // handler.ts exists as usual
      expect(existsSync(join(ppBase, 'handler.ts'))).toBe(true);
      // idempotence on path param spec
      const pp2 = await runAdd(root, 'rest/users/:id/get');
      expect(pp2.created.length).toBe(0);
      // Non-HTTP example
      await runAdd(root, 'step/activecampaign/contacts/getContact');
      const nonBase = join(
        root,
        'app',
        'functions',
        'step',
        'activecampaign',
        'contacts',
        'getContact',
      );
      expect(existsSync(join(nonBase, 'lambda.ts'))).toBe(true);
      const nonLambda = readFileSync(join(nonBase, 'lambda.ts'), 'utf8');
      expect(nonLambda).not.toMatch(derivable);
      expect(nonLambda).toMatch(/Registration: internal step function/);
      expect(nonLambda).toMatch(/eventType: (['"])step\1/);
      expectUncastHandler(nonBase);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
