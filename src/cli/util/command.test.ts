import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { localTsxCli, pathCommand } from '@/src/cli/util/command';

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
