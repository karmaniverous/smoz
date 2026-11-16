/* REQUIREMENTS ADDRESSED (TEST)
- The smoz bin is a launcher (get-dotenv Decision 33): when get-dotenv is
  missing it prints the three-route install hint to stderr and exits 1; when
  it is present it runs the CLI. Only a missing get-dotenv gets the hint.
*/
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  getDotenvInstallHint,
  isMissingGetDotenv,
  launch,
} from '@/src/cli/launcher';

const names = { bin: 'smoz', pkg: '@karmaniverous/smoz' };

/** The hint, exactly as get-dotenv's spec (4.7) gives it for smoz. */
const expectedHint = [
  'smoz needs @karmaniverous/get-dotenv ^8. Install it:',
  '  local:  npm i -D @karmaniverous/get-dotenv@^8',
  '  global: npm i -g @karmaniverous/get-dotenv@^8',
  '  npx:    npx -p @karmaniverous/get-dotenv@^8 -p @karmaniverous/smoz smoz',
].join('\n');

let dir: string;
/** The error Node throws when a module imports get-dotenv and it's absent. */
let missingGetDotenv: Error;

beforeAll(() => {
  // A module outside any project, so no node_modules can resolve get-dotenv,
  // imported by plain Node (vitest's own resolver would find the repo's copy).
  dir = mkdtempSync(path.join(os.tmpdir(), 'smoz-launcher-'));
  const file = path.join(dir, 'needs-get-dotenv.mjs');
  writeFileSync(file, "import '@karmaniverous/get-dotenv/cli';\n");
  const probe = [
    `try { await import(${JSON.stringify(pathToFileURL(file).href)}); }`,
    'catch (e) { console.log(JSON.stringify({ code: e.code, message: e.message })); }',
  ].join('\n');
  const { stdout } = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', probe],
    { cwd: dir, encoding: 'utf8' },
  );
  const { code, message } = JSON.parse(stdout) as {
    code: string;
    message: string;
  };
  missingGetDotenv = Object.assign(new Error(message), { code });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const io = () => ({ error: vi.fn<(m: string) => void>(), exit: vi.fn() });

describe('getDotenvInstallHint', () => {
  it('names the local, global and npx install routes', () => {
    expect(getDotenvInstallHint(names.bin, names.pkg)).toBe(expectedHint);
  });
});

describe('isMissingGetDotenv', () => {
  it("is true for Node's error when get-dotenv can't be resolved", () => {
    expect(missingGetDotenv).toMatchObject({ code: 'ERR_MODULE_NOT_FOUND' });
    expect(isMissingGetDotenv(missingGetDotenv)).toBe(true);
  });

  it('is false for another missing package, even one get-dotenv imports', () => {
    const error = Object.assign(
      new Error(
        "Cannot find package 'commander' imported from /app/node_modules/@karmaniverous/get-dotenv/dist/cli.mjs",
      ),
      { code: 'ERR_MODULE_NOT_FOUND' },
    );
    expect(isMissingGetDotenv(error)).toBe(false);
  });

  it('is false for other codes and for non-errors', () => {
    const message = "Cannot find package '@karmaniverous/get-dotenv'";
    expect(
      isMissingGetDotenv(
        Object.assign(new Error(message), { code: 'ERR_OTHER' }),
      ),
    ).toBe(false);
    expect(
      isMissingGetDotenv({ code: 'ERR_MODULE_NOT_FOUND', message: 42 }),
    ).toBe(false);
    expect(isMissingGetDotenv(message)).toBe(false);
    expect(isMissingGetDotenv(null)).toBe(false);
  });
});

describe('launch', () => {
  it('without get-dotenv, prints the hint and exits 1', async () => {
    const out = io();
    await launch(() => Promise.reject(missingGetDotenv), names, out);
    expect(out.error).toHaveBeenCalledExactlyOnceWith(expectedHint);
    expect(out.exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('writes the hint to stderr and exits the process by default', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
    try {
      await launch(() => Promise.reject(missingGetDotenv), names);
      expect(error).toHaveBeenCalledExactlyOnceWith(expectedHint);
      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    } finally {
      error.mockRestore();
      exit.mockRestore();
    }
  });

  it('with get-dotenv, runs the CLI', async () => {
    const out = io();
    const runSmoz = vi.fn(() => Promise.resolve());
    await launch(() => Promise.resolve({ runSmoz }), names, out);
    expect(runSmoz).toHaveBeenCalledOnce();
    expect(out.error).not.toHaveBeenCalled();
    expect(out.exit).not.toHaveBeenCalled();
  });

  it('rethrows any other load error', async () => {
    const out = io();
    const error = new Error('syntax error in the CLI');
    await expect(launch(() => Promise.reject(error), names, out)).rejects.toBe(
      error,
    );
    expect(out.exit).not.toHaveBeenCalled();
  });

  it("doesn't turn an error thrown by the running CLI into the hint", async () => {
    const out = io();
    const runSmoz = () => Promise.reject(missingGetDotenv);
    await expect(
      launch(() => Promise.resolve({ runSmoz }), names, out),
    ).rejects.toBe(missingGetDotenv);
    expect(out.error).not.toHaveBeenCalled();
  });
});
