/**
 * SMOZ CLI — get-dotenv–aware bootstrap (minimal, no Commander).
 *
 * - Default: print project signature (version, Node, repo root, stanPath, config presence)
 * - register: one-shot — generate app/generated/register.*.ts
 * - openapi: one-shot — run the app’s OpenAPI builder
 * - dev/add/init: mapped to existing implementations (minimal argv parsing)
 *
 * Notes:
 * - This is the first step of migrating to a full get-dotenv host. We dynamically
 *   import '@karmaniverous/get-dotenv' to keep the dependency live and ready for
 *   full host+plugin wiring in a follow-on change. Current surfaces preserve
 *   existing behavior used by CI/scripts (e.g., `tsx src/cli/index.ts register`).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { packageDirectorySync } from 'package-directory';

import { runAdd } from './add';
import { runDev } from './dev/index';
import { runWithHost } from './host/index';
import { runInit } from './init';
import { runOpenapi } from './openapi';
import { runRegister } from './register';
import { runGetDotenvHost } from './util/getdotenvHost';

type Pkg = { name?: string; version?: string };
const getRepoRoot = (): string => packageDirectorySync() ?? process.cwd();
const readPkg = (root: string): Pkg => {
  try {
    const raw = readFileSync(join(root, 'package.json'), 'utf8');
    return JSON.parse(raw) as Pkg;
  } catch {
    return {};
  }
};

const detectPackageManager = (): string | undefined => {
  const ua = process.env.npm_config_user_agent ?? '';
  if (ua.includes('pnpm')) return 'pnpm';
  if (ua.includes('yarn')) return 'yarn';
  if (ua.includes('npm')) return 'npm';
  return ua || undefined;
};

const detectStanPath = (root: string): string => {
  const candidate = '.stan';
  if (existsSync(join(root, candidate, 'system', 'stan.system.md'))) {
    return candidate;
  }
  return candidate;
};

const printSignature = (): void => {
  const root = getRepoRoot();
  const pkg = readPkg(root);
  const name = pkg.name ?? 'smoz';
  const version = pkg.version ?? '0.0.0';
  const pm = detectPackageManager();
  const stanPath = detectStanPath(root);
  const hasAppConfig = existsSync(join(root, 'app', 'config', 'app.config.ts'));
  const hasSmozJson = existsSync(join(root, 'smoz.config.json'));
  const hasSmozYaml =
    existsSync(join(root, 'smoz.config.yml')) ||
    existsSync(join(root, 'smoz.config.yaml'));

  console.log(`${name} v${version}`);
  console.log(`Node ${process.version}`);
  console.log(`Repo: ${root}`);
  console.log(`stanPath: ${stanPath}`);
  console.log(
    `app/config/app.config.ts: ${hasAppConfig ? 'found' : 'missing'}`,
  );
  console.log(
    `smoz.config.*: ${hasSmozJson || hasSmozYaml ? 'found' : 'absent'}`,
  );
  if (pm) console.log(`PM: ${pm}`);
};

// Dynamically import get-dotenv so the dependency is active.
const ensureGetDotenvLoaded = async (): Promise<void> => {
  try {
    await import('@karmaniverous/get-dotenv');
  } catch {
    // Best-effort: absence should not prevent core commands (register/openapi) from running.
  }
};

const main = async (): Promise<void> => {
  await ensureGetDotenvLoaded();

  const root = getRepoRoot();
  const pkg = readPkg(root);
  const branding = `${pkg.name ?? 'smoz'} v${pkg.version ?? '0.0.0'}`;
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  // Optional: route all commands through the get-dotenv host when requested.
  // This keeps current behavior as default while enabling early host testing.
  if (process.env.SMOZ_HOST === '1') {
    try {
      await runWithHost(argv, branding);
      return;
    } catch {
      // Fall back to legacy mapping below.
    }
  }
  if (!cmd) {
    printSignature();
    return;
  }

  try {
    switch (cmd) {
      case 'cmd':
      case 'batch': {
        // Delegate to the get-dotenv plugin-first host for these commands.
        try {
          await runGetDotenvHost(argv, branding);
        } catch (e) {
          console.error((e as Error).message);
          process.exitCode = 1;
        }
        return;
      }
      case 'register': {
        const { wrote } = await runRegister(root);
        console.log(
          wrote.length ? `Updated:\n - ${wrote.join('\n - ')}` : 'No changes.',
        );
        return;
      }
      case 'openapi': {
        await runOpenapi(root, { verbose: true });
        return;
      }
      case 'add': {
        const spec = argv[1];
        if (!spec) throw new Error('Usage: smoz add <spec>');
        const { created, skipped } = await runAdd(root, spec);
        console.log(
          created.length
            ? `Created:\n - ${created.join('\n - ')}${
                skipped.length
                  ? `\nSkipped (exists):\n - ${skipped.join('\n - ')}`
                  : ''
              }`
            : 'Nothing created (files already exist).',
        );
        return;
      }
      case 'init': {
        // Minimal flags: -t/--template, -y, --no-install
        const getOpt = (flag: string, alt?: string) => {
          const i = argv.findIndex((a) => a === flag || a === alt);
          return i >= 0 ? argv[i + 1] : undefined;
        };
        const has = (flag: string) => argv.includes(flag);
        const template = getOpt('-t', '--template') ?? 'default';
        const yes = has('-y') || has('--yes');
        const noInstall = has('--no-install');
        const { created, skipped, examples, merged, installed } = await runInit(
          root,
          template,
          { yes, noInstall },
        );
        console.log(
          [
            created.length
              ? `Created:\n - ${created.join('\n - ')}`
              : 'Created: (none)',
            examples.length
              ? `Examples (existing preserved):\n - ${examples.join('\n - ')}`
              : undefined,
            skipped.length
              ? `Skipped (exists):\n - ${skipped.join('\n - ')}`
              : undefined,
            merged.length
              ? `package.json (additive):\n - ${merged.join('\n - ')}`
              : undefined,
            `Install: ${installed}`,
          ]
            .filter(Boolean)
            .join('\n'),
        );
        return;
      }
      case 'dev': {
        // Minimal parsing for dev; defaults mirror previous CLI.
        const has = (flag: string) => argv.includes(flag);
        const getOpt = (flag: string) => {
          const i = argv.findIndex((a) => a === flag);
          return i >= 0 ? argv[i + 1] : undefined;
        };
        const local = ((): false | 'inline' | 'offline' => {
          const v = getOpt('-l') ?? getOpt('--local');
          if (v === 'inline' || v === 'offline') return v;
          if (has('-l') && !v) return 'inline';
          return 'inline';
        })();
        const stage = getOpt('-s') ?? getOpt('--stage');
        const portRaw = getOpt('-p') ?? getOpt('--port');
        const port = typeof portRaw === 'string' ? Number(portRaw) : 0;
        const verbose = has('-V') || has('--verbose');
        await runDev(root, {
          register: !has('--no-register'),
          openapi: !has('--no-openapi'),
          local,
          ...(stage ? { stage } : {}),
          port,
          verbose,
        });
        return;
      }
      default: {
        printSignature();
        console.log(`\nUnknown command: ${cmd}`);
      }
    }
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  }
};

void main();
