/**
 * Cross-platform child process commands for the CLI.
 *
 * Never passes an args array together with `shell: true` (Node DEP0190:
 * args would be concatenated unescaped).
 */
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
