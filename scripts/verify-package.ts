/**
 * Verify the packed package without get-dotenv (an optional peer; get-dotenv
 * spec Decisions 32 and 33). Run after `npm run build`.
 *
 * Packs smoz, installs the tarball into a temp project (npm doesn't install
 * optional peers, so get-dotenv is absent), then checks that:
 * - the main entry imports and runs;
 * - `@karmaniverous/smoz/cli`, the only entry that loads get-dotenv, fails to
 *   load with get-dotenv's module-not-found error;
 * - the `smoz` bin prints the three-route install hint and exits 1;
 * - `tsc` with `skipLibCheck: false` type-checks a consumer of the main entry;
 * - zod is imported, not bundled.
 *
 * Usage: `tsx scripts/verify-package.ts`. Needs the network (or npm's cache)
 * for smoz's own dependencies.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import { getDotenvInstallHint } from '../src/cli/launcher';

const repoRoot = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const npmCli = process.env.npm_execpath;
const npm = (args: string[], cwd: string): string =>
  npmCli
    ? execFileSync(process.execPath, [npmCli, ...args], {
        cwd,
        encoding: 'utf8',
      })
    : execFileSync('npm', args, { cwd, encoding: 'utf8', shell: true });

/** The version of `name` installed here (its package.json may not be exported). */
const installedVersion = (name: string): string =>
  (
    JSON.parse(
      readFileSync(
        path.join(repoRoot, 'node_modules', name, 'package.json'),
        'utf8',
      ),
    ) as { version: string }
  ).version;

const fail = (message: string): never => {
  throw new Error(`verify:package: ${message}`);
};

const node = (cwd: string, args: string[]) =>
  spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

/** Fixture files for the consumer type check. */
const consumerTs = `import { App, baseEventTypeMapSchema, toPosixPath } from '@karmaniverous/smoz';

export const app: typeof App = App;
export const schema = baseEventTypeMapSchema;
export const posix: string = toPosixPath('a\\\\b');
`;

const consumerTsconfig = {
  compilerOptions: {
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'es2022',
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    types: ['node'],
  },
  files: ['index.ts'],
};

const work = mkdtempSync(path.join(os.tmpdir(), 'smoz-verify-package-'));
try {
  // 1. Pack and install without get-dotenv.
  const packDir = path.join(work, 'pack');
  mkdirSync(packDir);
  npm(['pack', '--silent', '--pack-destination', packDir], repoRoot);
  const tarball = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
  if (!tarball) fail('npm pack produced no tarball');
  const app = path.join(work, 'app');
  mkdirSync(app);
  writeFileSync(
    path.join(app, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' }),
  );
  npm(
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      '--prefer-offline',
      path.join(packDir, tarball!),
      // The type check's own inputs (not get-dotenv).
      `@types/node@${installedVersion('@types/node')}`,
    ],
    app,
  );
  if (
    existsSync(path.join(app, 'node_modules', '@karmaniverous', 'get-dotenv'))
  )
    fail('get-dotenv was installed; it must be an optional peer');

  // 2. The main entry imports and runs.
  const main = node(app, [
    '--input-type=module',
    '-e',
    "const m = await import('@karmaniverous/smoz'); if (m.toPosixPath('a\\\\b') !== 'a/b') process.exit(2);",
  ]);
  if (main.status !== 0)
    fail(`main entry failed without get-dotenv:\n${main.stderr}`);

  // 3. ./cli needs get-dotenv.
  const cli = node(app, [
    '--input-type=module',
    '-e',
    "await import('@karmaniverous/smoz/cli');",
  ]);
  if (
    cli.status === 0 ||
    !cli.stderr.includes('ERR_MODULE_NOT_FOUND') ||
    !cli.stderr.includes("'@karmaniverous/get-dotenv'")
  )
    fail(`./cli should fail on the missing get-dotenv:\n${cli.stderr}`);

  // 4. The bin prints the install hint and exits 1.
  const bin = node(app, [
    path.join(
      app,
      'node_modules',
      '@karmaniverous',
      'smoz',
      'dist',
      'cli',
      'index.mjs',
    ),
    '--help',
  ]);
  const hint = getDotenvInstallHint('smoz', '@karmaniverous/smoz');
  if (bin.status !== 1 || bin.stderr.trim() !== hint || bin.stdout !== '')
    fail(
      `bin: expected the install hint and exit 1, got exit ${String(bin.status)}:\n${bin.stderr}${bin.stdout}`,
    );

  // 5. tsc, skipLibCheck: false, against the packed main entry's types. The
  // main entry's types use smoz's other optional peers (middy, zod-openapi,
  // @serverless/typescript), as an app installs them; get-dotenv stays out.
  const { peerDependencies = {} } = JSON.parse(
    readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  ) as { peerDependencies?: Record<string, string> };
  const otherPeers = Object.keys(peerDependencies)
    .filter((name) => name !== '@karmaniverous/get-dotenv')
    .map((name) => `${name}@${installedVersion(name)}`);
  const declarationPeers = [
    '@aws/durable-execution-sdk-js@^2.0.0',
    'type-fest@^5.0.0',
  ];
  npm(
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      '--prefer-offline',
      ...otherPeers,
      ...declarationPeers,
    ],
    app,
  );
  if (
    existsSync(path.join(app, 'node_modules', '@karmaniverous', 'get-dotenv'))
  )
    fail('get-dotenv was installed with the other peers');
  writeFileSync(path.join(app, 'index.ts'), consumerTs);
  writeFileSync(
    path.join(app, 'tsconfig.json'),
    JSON.stringify(consumerTsconfig, null, 2),
  );
  const tsc = node(app, [
    require.resolve('typescript/bin/tsc'),
    '-p',
    '.',
    '--pretty',
    'false',
  ]);
  // @serverless/typescript 4.30.0 has one known declaration error with
  // skipLibCheck off. Keep the exception exact so every new consumer, smoz,
  // get-dotenv, or third-party diagnostic still fails this verification.
  const errors = `${tsc.stdout}${tsc.stderr}`
    .split(/\r?\n/)
    .filter((line) => /error TS\d+/.test(line));
  const knownServerlessError = (line: string): boolean =>
    line
      .replace(/\\/g, '/')
      .includes(
        'node_modules/@serverless/typescript/index.d.ts(1485,7): error TS2411:',
      ) && line.includes(`Property '"Fn::Transform"'`);
  const unexpected = errors.filter((line) => !knownServerlessError(line));
  if (unexpected.length || (tsc.status !== 0 && !errors.length))
    fail(
      `tsc (skipLibCheck: false) failed:\n${unexpected.join('\n') || tsc.stdout + tsc.stderr}`,
    );
  if (errors.length)
    console.log(
      `verify:package: recognized @serverless/typescript 4.30.0's exact TS2411 declaration defect:\n  ${errors.join('\n  ')}`,
    );

  // 6. zod is imported, not bundled.
  const dist = path.join(
    app,
    'node_modules',
    '@karmaniverous',
    'smoz',
    'dist',
    'mjs',
  );
  const bundledZod = readdirSync(dist, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.js'))
    .filter((f) =>
      /class \$?ZodError\b/.test(readFileSync(path.join(dist, f), 'utf8')),
    );
  if (bundledZod.length) fail(`zod is bundled in ${bundledZod.join(', ')}`);

  console.log(
    'verify:package: main entry, ./cli, bin hint, tsc (skipLibCheck: false) and zod external all OK without get-dotenv',
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
