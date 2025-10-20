/**
 * SMOZ command plugin
 *
 * Register smoz commands (init/add/register/openapi/dev) on a get-dotenv host and
 * delegate to existing implementations. The host API is intentionally generic:
 * we detect a few common registration shapes to avoid tight coupling until the
 * host’s public API is finalized.
 *
 * Requirements addressed:
 * - Plugin-first host: expose init/add/register/openapi/dev on the get-dotenv host.
 * - Delegation: map flags to existing run* functions (no business logic here).
 * - Stage precedence & spawn-env normalization: honored by delegating to existing helpers.
 *
 * Notes:
 * - Do not import side-effect modules at load time beyond the run* functions.
 * - Keep registration resilient to differing host shapes (addCommand/registerCommand/etc.).
 */
import { packageDirectorySync } from 'package-directory';

import { runAdd } from '@/src/cli/add';
import { runDev } from '@/src/cli/dev/index';
import { runInit } from '@/src/cli/init';
import { runOpenapi } from '@/src/cli/openapi';
import { runRegister } from '@/src/cli/register';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HostLike = Record<string, any>;

type Runner = (argv: string[]) => Promise<void>;

const repoRoot = (): string => packageDirectorySync() ?? process.cwd();

/** Minimal argv helpers (no Commander dependency, stable with current CLI semantics). */
const has = (argv: string[], ...flags: string[]): boolean =>
  argv.some((a) => flags.includes(a));
const getOpt = (argv: string[], ...flags: string[]): string | undefined => {
  const i = argv.findIndex((a) => flags.includes(a));
  return i >= 0 ? argv[i + 1] : undefined;
};

/** Install a command runner on a variety of host shapes safely. */
const install = (host: HostLike, name: string, run: Runner): void => {
  try {
    if (typeof host.addCommand === 'function') {
      (host.addCommand as (n: string, r: Runner) => void).call(host, name, run);
      return;
    }
    if (typeof host.registerCommand === 'function') {
      (
        host.registerCommand as (def: { name: string; run: Runner }) => void
      ).call(host, { name, run });
      return;
    }
    if (typeof host.command === 'function') {
      (host.command as (n: string, r: Runner) => void).call(host, name, run);
      return;
    }
  } catch {
    // fall through to last resort
  }
  // Last resort: attach on a stable property so tests (or simple hosts) can reach it.
  // Consumers can detect presence of these properties to invoke runners directly.
  (host as Record<string, unknown>)[`__cmd_${name}`] = run;
};

/**
 * Attach SMOZ commands to a host (init/add/register/openapi/dev).
 *
 * @param host - get-dotenv host instance (when available)
 */
export const attachSmozCommands = (host: HostLike): void => {
  // init
  install(host, 'init', async (argv: string[]) => {
    const root = repoRoot();
    const template = getOpt(argv, '-t', '--template') ?? 'default';
    // Conflict policy: 'overwrite' | 'example' | 'skip' | 'ask'
    const conflict = getOpt(argv, '--conflict');
    const yes = has(argv, '-y', '--yes');
    // Install policy: --no-install or --install <pm>
    const noInstall = has(argv, '--no-install');
    const installPm = getOpt(argv, '--install');
    await runInit(root, template, {
      ...(yes ? { yes } : {}),
      ...(noInstall ? { noInstall } : {}),
      ...(installPm ? { install: installPm } : {}),
      ...(conflict ? { conflict } : {}),
    });
  });

  // add
  install(host, 'add', async (argv: string[]) => {
    const root = repoRoot();
    // Expect a single positional spec (no flag parsing here).
    const spec =
      argv.find((a) => !a.startsWith('-')) ??
      getOpt(argv, '--spec') ??
      getOpt(argv, '-s');
    if (!spec || typeof spec !== 'string' || !spec.trim()) {
      throw new Error('smoz add: missing <spec> (e.g., rest/foo/get)');
    }
    await runAdd(root, spec);
  });

  // register
  install(host, 'register', async () => {
    const root = repoRoot();
    await runRegister(root);
  });

  // openapi
  install(host, 'openapi', async (argv: string[]) => {
    const root = repoRoot();
    const verbose = has(argv, '-V', '--verbose');
    await runOpenapi(root, { verbose });
  });

  // dev
  install(host, 'dev', async (argv: string[]) => {
    const root = repoRoot();
    const verbose = has(argv, '-V', '--verbose');
    const stage = getOpt(argv, '-s', '--stage');
    const portStr = getOpt(argv, '-p', '--port');
    const port =
      typeof portStr === 'string' && portStr.trim().length > 0
        ? Number(portStr)
        : undefined;
    const localRaw = getOpt(argv, '-l', '--local');
    const local: false | 'inline' | 'offline' =
      localRaw === 'inline' || localRaw === 'offline'
        ? localRaw
        : has(argv, '-l') && !localRaw
          ? 'inline'
          : 'inline';
    const register = has(argv, '-r', '--register')
      ? true
      : has(argv, '-R', '--no-register')
        ? false
        : true;
    const openapi = has(argv, '-o', '--openapi')
      ? true
      : has(argv, '-O', '--no-openapi')
        ? false
        : true;

    await runDev(root, {
      register,
      openapi,
      local,
      ...(typeof stage === 'string' ? { stage } : {}),
      ...(typeof port === 'number' ? { port } : {}),
      verbose,
    });
  });
};
