/**
 * Bin launcher: loads the CLI module (and through it get-dotenv, an optional
 * peer) with a dynamic `import()`. When get-dotenv isn't installed it prints
 * the three install routes to stderr and exits 1, instead of a module
 * resolution stack trace (get-dotenv Decision 33). Imports nothing from
 * get-dotenv.
 *
 * @module
 */

/** The get-dotenv range smoz needs. */
const getDotenv = '@karmaniverous/get-dotenv@^8.0.0';

/**
 * The install hint printed when get-dotenv is missing.
 *
 * @param bin - the bin name (`smoz`)
 * @param pkg - the package that provides the bin
 */
export const getDotenvInstallHint = (bin: string, pkg: string): string =>
  [
    `${bin} needs @karmaniverous/get-dotenv ^8.0.0. Install it:`,
    `  local:  npm i -D ${getDotenv}`,
    `  global: npm i -g ${getDotenv}`,
    `  npx:    npx -p ${getDotenv} -p ${pkg} ${bin}`,
  ].join('\n');

/**
 * True when `error` is Node's failure to resolve the get-dotenv package
 * itself (`ERR_MODULE_NOT_FOUND`, "Cannot find package
 * '@karmaniverous/get-dotenv'"). A different missing module, even one
 * imported from inside get-dotenv, is not.
 */
export const isMissingGetDotenv = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'ERR_MODULE_NOT_FOUND' &&
    typeof message === 'string' &&
    message.includes(`'@karmaniverous/get-dotenv'`)
  );
};

/** What the launcher writes to and how it exits (injectable for tests). */
export interface LauncherIo {
  error: (message: string) => void;
  exit: (code: number) => void;
}

const processIo: LauncherIo = {
  error: (message) => {
    console.error(message);
  },
  exit: (code) => {
    process.exit(code);
  },
};

/**
 * Load the CLI module and run it. Only the load is guarded: an error thrown
 * while the CLI runs propagates unchanged.
 *
 * @param load - dynamic import of the CLI module
 * @param names - the bin and its package, for the install hint
 * @param io - stderr writer and exit (defaults to the process)
 */
export const launch = async (
  load: () => Promise<{ runSmoz: () => Promise<void> }>,
  names: { bin: string; pkg: string },
  io: LauncherIo = processIo,
): Promise<void> => {
  let cli: { runSmoz: () => Promise<void> };
  try {
    cli = await load();
  } catch (error) {
    if (!isMissingGetDotenv(error)) throw error;
    io.error(getDotenvInstallHint(names.bin, names.pkg));
    io.exit(1);
    return;
  }
  await cli.runSmoz();
};
