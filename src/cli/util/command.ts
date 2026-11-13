/**
 * Cross-platform child process commands for the CLI.
 *
 * Never passes an args array together with `shell: true` (Node DEP0190:
 * args would be concatenated unescaped).
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/** Arguments for `spawn`/`spawnSync`: `spawn(cmd, args, { shell })`. */
export interface SpawnSpec {
  cmd: string;
  args: string[];
  shell: boolean;
}

/**
 * Quote one token for a cmd.exe command line.
 *
 * Rejects what quoting can't make safe: `"` (ends the quotes), `%` (cmd.exe
 * expands `%VAR%` even inside quotes) and, in a token that needs quotes, a
 * trailing `\` (it would escape the closing quote).
 */
const quoteForCmd = (token: string): string => {
  const reject = (what: string) =>
    new Error(
      `Cannot pass an argument containing ${what} through the Windows shell: ${token}`,
    );
  if (token.includes('"')) throw reject('a double quote');
  if (token.includes('%')) throw reject('a percent sign');
  if (/^[\w./\\:=@+-]+$/.test(token)) return token;
  if (token.endsWith('\\')) throw reject('a trailing backslash');
  return `"${token}"`;
};

/**
 * Command for a binary found on PATH (e.g. `npm`, `tsx`, `serverless`).
 *
 * POSIX: spawned directly, no shell. Windows: these are `.cmd` shims, which
 * Node only runs through the shell, so the command is one pre-quoted command
 * line with no args array.
 *
 * @param bin - binary name without extension
 * @param args - arguments (on Windows: no `"` or `%`, and no trailing `\` in an argument that needs quotes)
 * @param platform - target platform (defaults to the current one)
 * @returns spawn arguments
 * @throws Error on Windows when an argument contains `"` or `%`, or needs quotes and ends with `\`
 */
export const pathCommand = (
  bin: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): SpawnSpec =>
  platform === 'win32'
    ? { cmd: [bin, ...args].map(quoteForCmd).join(' '), args: [], shell: true }
    : { cmd: bin, args: [...args], shell: false };

/**
 * Absolute path of the tsx CLI installed for the project at `root`, or
 * undefined when tsx isn't resolvable from there.
 *
 * @param root - project root (a directory containing package.json)
 */
export const localTsxCli = (root: string): string | undefined => {
  try {
    return createRequire(path.resolve(root, 'package.json')).resolve('tsx/cli');
  } catch {
    return undefined;
  }
};

/**
 * Absolute path of a file inside a package installed for the project at
 * `root`, or undefined when the package (or the file) isn't installed.
 *
 * Searches the same `node_modules` directories Node would, nearest first:
 * the project's own, then each ancestor's. That finds packages npm hoisted
 * to a workspace root, e.g. prettier at `<repo>/node_modules` for a service
 * in `<repo>/packages/service`. Node's global folders are skipped, so only
 * project-installed packages count. Package `exports` are not consulted, so
 * files a package doesn't export (like a `bin` script) can be found.
 *
 * @param root - project root (a directory containing package.json)
 * @param pkg - package name, e.g. `prettier` or `@scope/name`
 * @param file - path of the file inside the package, e.g. `bin/prettier.cjs`
 */
export const localPackageFile = (
  root: string,
  pkg: string,
  file: string,
): string | undefined => {
  const lookupDirs =
    createRequire(path.resolve(root, 'package.json')).resolve.paths(pkg) ?? [];
  return lookupDirs
    .filter((dir) => path.basename(dir) === 'node_modules')
    .map((dir) => path.join(dir, pkg, file))
    .find((candidate) => existsSync(candidate));
};
