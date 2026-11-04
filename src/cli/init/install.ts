import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { pathCommand } from '@/src/cli/util/command';

export const detectPm = (
  root: string,
): 'pnpm' | 'yarn' | 'npm' | 'bun' | undefined => {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'package-lock.json'))) return 'npm';
  if (existsSync(join(root, 'bun.lockb'))) return 'bun';
  const ua = process.env.npm_config_user_agent ?? '';
  if (ua.includes('pnpm')) return 'pnpm';
  if (ua.includes('yarn')) return 'yarn';
  if (ua.includes('bun')) return 'bun';
  if (ua.includes('npm')) return 'npm';
  return undefined;
};

export const runInstall = (
  root: string,
  pm?: string,
):
  | 'ran (npm)'
  | 'ran (pnpm)'
  | 'ran (yarn)'
  | 'ran (bun)'
  | 'skipped'
  | 'unknown-pm'
  | 'failed' => {
  if (!pm) return 'skipped';
  const known = pm === 'pnpm' || pm === 'yarn' || pm === 'bun' || pm === 'npm';
  if (!known) return 'unknown-pm';

  const { cmd, args, shell } = pathCommand(pm, ['install']);
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, shell });

  if (res.status === 0) {
    const tag: 'ran (pnpm)' | 'ran (yarn)' | 'ran (bun)' | 'ran (npm)' =
      pm === 'pnpm'
        ? 'ran (pnpm)'
        : pm === 'yarn'
          ? 'ran (yarn)'
          : pm === 'bun'
            ? 'ran (bun)'
            : 'ran (npm)';
    return tag;
  }

  return 'failed';
};
