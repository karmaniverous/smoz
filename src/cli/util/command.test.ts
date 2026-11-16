import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  localPackageBin,
  localTsxCli,
  pathCommand,
} from '@/src/cli/util/command';

describe('cli/util/command.pathCommand', () => {
  it('spawns directly without a shell on POSIX', () => {
    expect(pathCommand('npm', ['install', 'a b'], 'linux')).toEqual({
      cmd: 'npm',
      args: ['install', 'a b'],
      shell: false,
    });
  });

  it('builds one quoted command line with no args array on Windows', () => {
    expect(
      pathCommand(
        'tsx',
        ['C:\\My Apps\\entry.ts', '--stage', 'dev', 'D:/a/b.ts'],
        'win32',
      ),
    ).toEqual({
      cmd: 'tsx "C:\\My Apps\\entry.ts" --stage dev D:/a/b.ts',
      args: [],
      shell: true,
    });
  });

  it('rejects a double quote on Windows instead of passing it unescaped', () => {
    expect(() => pathCommand('npm', ['a"b'], 'win32')).toThrow(/double quote/);
  });

  it('rejects a percent sign on Windows, quoted or not (cmd.exe expands %VAR%)', () => {
    expect(() => pathCommand('npm', ['%PATH%'], 'win32')).toThrow(
      'a percent sign through the Windows shell: %PATH%',
    );
    expect(() => pathCommand('npm', ['a %b'], 'win32')).toThrow(/percent sign/);
    // POSIX has no shell, so both pass through untouched.
    expect(pathCommand('npm', ['%PATH%', 'a\\'], 'linux').args).toEqual([
      '%PATH%',
      'a\\',
    ]);
  });

  it('rejects a trailing backslash only where it would escape the closing quote', () => {
    expect(() => pathCommand('tsx', ['C:\\My Apps\\'], 'win32')).toThrow(
      'a trailing backslash through the Windows shell: C:\\My Apps\\',
    );
    // Unquoted, a trailing backslash is harmless.
    expect(pathCommand('tsx', ['C:\\apps\\'], 'win32').cmd).toBe(
      'tsx C:\\apps\\',
    );
  });
});

describe('cli/util/command.localTsxCli', () => {
  it("resolves the project's tsx CLI", () => {
    const expected = createRequire(
      path.resolve(process.cwd(), 'package.json'),
    ).resolve('tsx/cli');
    expect(localTsxCli(process.cwd())).toBe(expected);
  });

  it('returns undefined when tsx is not installed', () => {
    expect(
      localTsxCli(path.resolve('/', 'tmp', 'smoz-no-tsx-here')),
    ).toBeUndefined();
  });
});

describe('cli/util/command.localPackageBin', () => {
  // <repo>/package.json + <repo>/packages/service/package.json: an npm
  // workspaces layout.
  let repo: string;
  let service: string;

  const writeFile = (file: string, content = '') => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };

  /** Install a package with a bin script under `<dir>/node_modules`. */
  const install = (
    dir: string,
    pkg: string,
    bin: string | Record<string, string>,
    scripts: string[] = typeof bin === 'string' ? [bin] : Object.values(bin),
  ) => {
    const pkgDir = path.join(dir, 'node_modules', pkg);
    writeFile(path.join(pkgDir, 'package.json'), JSON.stringify({ bin }));
    for (const script of scripts) writeFile(path.join(pkgDir, script));
    return pkgDir;
  };

  beforeEach(() => {
    repo = mkdtempSync(path.join(tmpdir(), 'smoz-pkgbin-'));
    service = path.join(repo, 'packages', 'service');
    writeFile(path.join(repo, 'package.json'), '{}');
    writeFile(path.join(service, 'package.json'), '{}');
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("finds a bin in the project's own node_modules", () => {
    const pkgDir = install(service, 'prettier', './bin/prettier.cjs');
    expect(localPackageBin(service, 'prettier')).toBe(
      path.join(pkgDir, 'bin', 'prettier.cjs'),
    );
  });

  it('finds a package hoisted to the workspace root', () => {
    const pkgDir = install(repo, 'prettier', './bin/prettier.cjs');
    expect(localPackageBin(service, 'prettier')).toBe(
      path.join(pkgDir, 'bin', 'prettier.cjs'),
    );
  });

  it('reads the named entry when bin is an object (serverless v4 ships run.js)', () => {
    const pkgDir = install(repo, 'serverless', {
      serverless: 'run.js',
      sls: 'run.js',
    });
    expect(localPackageBin(service, 'serverless')).toBe(
      path.join(pkgDir, 'run.js'),
    );
  });

  it('defaults the bin name to the unscoped package name', () => {
    const pkgDir = install(repo, '@scope/tool', {
      tool: 'cli.js',
      other: 'x.js',
    });
    expect(localPackageBin(service, '@scope/tool')).toBe(
      path.join(pkgDir, 'cli.js'),
    );
    expect(localPackageBin(service, '@scope/tool', 'other')).toBe(
      path.join(pkgDir, 'x.js'),
    );
  });

  it("uses the project's own copy over a hoisted one", () => {
    const near = install(service, 'serverless', { serverless: 'run.js' });
    install(repo, 'serverless', { serverless: 'bin/serverless.js' });
    expect(localPackageBin(service, 'serverless')).toBe(
      path.join(near, 'run.js'),
    );
  });

  it('does not fall through to a hoisted copy when the nearest copy lacks the bin', () => {
    install(service, 'prettier', { other: 'x.js' });
    install(repo, 'prettier', './bin/prettier.cjs');
    expect(localPackageBin(service, 'prettier')).toBeUndefined();
  });

  it('returns undefined when the bin script is missing on disk', () => {
    install(repo, 'prettier', './bin/prettier.cjs', []);
    expect(localPackageBin(service, 'prettier')).toBeUndefined();
  });

  it('returns undefined for an unreadable package.json', () => {
    writeFile(path.join(repo, 'node_modules', 'prettier', 'package.json'), '{');
    expect(localPackageBin(service, 'prettier')).toBeUndefined();
  });

  it('ignores packages reachable only through NODE_PATH', () => {
    // Node reads NODE_PATH once at startup, so check it in a fresh process.
    const global = path.join(repo, 'global');
    install(global, 'smoz-global-only', './cli.js');
    const helper = pathToFileURL(path.resolve('src/cli/util/command.ts')).href;
    const script = [
      `const { localPackageBin } = await import(${JSON.stringify(helper)});`,
      `console.log(String(localPackageBin(${JSON.stringify(service)}, 'smoz-global-only')));`,
    ].join('\n');
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '-e', script],
      {
        encoding: 'utf8',
        env: { ...process.env, NODE_PATH: path.join(global, 'node_modules') },
      },
    );
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe('undefined');
  });

  it('returns undefined when the package is not installed', () => {
    expect(localPackageBin(service, 'smoz-no-such-package')).toBeUndefined();
  });
});
