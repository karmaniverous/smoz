import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  localPackageFile,
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

describe('cli/util/command.localPackageFile', () => {
  // <repo>/package.json + <repo>/packages/service/package.json: an npm
  // workspaces layout.
  let repo: string;
  let service: string;

  const writeFile = (file: string, content = '') => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };

  beforeEach(() => {
    repo = mkdtempSync(path.join(tmpdir(), 'smoz-pkgfile-'));
    service = path.join(repo, 'packages', 'service');
    writeFile(path.join(repo, 'package.json'), '{}');
    writeFile(path.join(service, 'package.json'), '{}');
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("finds a file in the project's own node_modules", () => {
    const file = path.join(
      service,
      'node_modules',
      'prettier',
      'bin',
      'prettier.cjs',
    );
    writeFile(file);
    expect(localPackageFile(service, 'prettier', 'bin/prettier.cjs')).toBe(
      file,
    );
  });

  it('finds a package hoisted to the workspace root', () => {
    const file = path.join(
      repo,
      'node_modules',
      'prettier',
      'bin',
      'prettier.cjs',
    );
    writeFile(file);
    expect(localPackageFile(service, 'prettier', 'bin/prettier.cjs')).toBe(
      file,
    );
  });

  it('prefers the nearest copy when both exist', () => {
    const near = path.join(
      service,
      'node_modules',
      'serverless',
      'bin',
      'serverless.js',
    );
    writeFile(near);
    writeFile(
      path.join(repo, 'node_modules', 'serverless', 'bin', 'serverless.js'),
    );
    expect(localPackageFile(service, 'serverless', 'bin/serverless.js')).toBe(
      near,
    );
  });

  it('skips a nearer copy of the package that lacks the file', () => {
    writeFile(
      path.join(service, 'node_modules', 'prettier', 'package.json'),
      '{}',
    );
    const file = path.join(
      repo,
      'node_modules',
      'prettier',
      'bin',
      'prettier.cjs',
    );
    writeFile(file);
    expect(localPackageFile(service, 'prettier', 'bin/prettier.cjs')).toBe(
      file,
    );
  });

  it('resolves scoped package names', () => {
    const file = path.join(repo, 'node_modules', '@scope', 'tool', 'cli.js');
    writeFile(file);
    expect(localPackageFile(service, '@scope/tool', 'cli.js')).toBe(file);
  });

  it('returns undefined when the package is not installed', () => {
    expect(
      localPackageFile(service, 'smoz-no-such-package', 'bin/cli.js'),
    ).toBeUndefined();
  });
});
