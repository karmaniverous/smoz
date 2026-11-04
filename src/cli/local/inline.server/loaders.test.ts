import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_BINARY_MEDIA_TYPES } from './binaryMediaTypes';
import { loadApp, loadBinaryMediaTypes, loadRegisters } from './loaders';

const dirs: string[] = [];

/** A temp project root holding the given files (relative path to source). */
const projectWith = (files: Record<string, string>): string => {
  const dir = mkdtempSync(path.join(tmpdir(), 'smoz-inline-'));
  dirs.push(dir);
  for (const [rel, source] of Object.entries(files)) {
    const p = path.join(dir, rel);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, source);
  }
  return dir;
};

/** A temp project root, with `serverless.ts` when source is given. */
const project = (serverlessTs?: string): string =>
  projectWith(
    serverlessTs === undefined ? {} : { 'serverless.ts': serverlessTs },
  );

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
});

describe('loadRegisters', () => {
  it('imports the generated function registers and names them when verbose', async () => {
    vi.stubEnv('SMOZ_VERBOSE', '1');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const root = projectWith({
      'app/generated/register.functions.ts':
        '(globalThis as Record<string, unknown>).__smozRegistered = true;\n',
    });
    await loadRegisters(root);
    expect((globalThis as Record<string, unknown>).__smozRegistered).toBe(true);
    expect(log).toHaveBeenCalledWith(
      '[inline] registers loaded:',
      'app/generated/register.functions.ts',
    );
  });

  it('warns when no register module loads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await loadRegisters(projectWith({}));
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/smoz register/));
  });
});

describe('loadApp', () => {
  it('returns the app exported by app/config/app.config.ts', async () => {
    const root = projectWith({
      'app/config/app.config.ts':
        'export const app = { buildAllServerlessFunctions: () => ({ fn: {} }) };\n',
    });
    expect((await loadApp(root)).buildAllServerlessFunctions()).toEqual({
      fn: {},
    });
  });

  it('throws when the module does not export an app', async () => {
    const root = projectWith({
      'app/config/app.config.ts': 'export const other = 1;\n',
    });
    await expect(loadApp(root)).rejects.toThrow(/missing export "app"/);
  });
});

describe('loadBinaryMediaTypes', () => {
  it("reads the app's serverless.ts provider.apiGateway.binaryMediaTypes", async () => {
    const root = project(
      "export default { provider: { apiGateway: { binaryMediaTypes: ['image/*', 'multipart/form-data'] } } };\n",
    );
    const { types, source } = await loadBinaryMediaTypes(root);
    expect(types).toEqual(['image/*', 'multipart/form-data']);
    expect(source).toMatch(/serverless\.ts/);
  });

  it('awaits an async (Promise) serverless.ts default export', async () => {
    const root = project(
      "export default Promise.resolve({ provider: { apiGateway: { binaryMediaTypes: ['image/png'] } } });\n",
    );
    expect((await loadBinaryMediaTypes(root)).types).toEqual(['image/png']);
  });

  it('applies none when serverless.ts sets none, as API Gateway does', async () => {
    const root = project("export default { provider: { name: 'aws' } };\n");
    expect((await loadBinaryMediaTypes(root)).types).toEqual([]);
  });

  it('falls back to the defaults without serverless.ts', async () => {
    const { types, source } = await loadBinaryMediaTypes(project());
    expect(types).toEqual(DEFAULT_BINARY_MEDIA_TYPES);
    expect(source).toBe('defaults (no serverless.ts)');
  });

  it('warns and falls back to the defaults when serverless.ts fails to load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const root = project("throw new Error('boom');\nexport default {};\n");
    const { types, source } = await loadBinaryMediaTypes(root);
    expect(types).toEqual(DEFAULT_BINARY_MEDIA_TYPES);
    expect(source).toBe('defaults (serverless.ts failed to load)');
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/boom/));
  });
});
