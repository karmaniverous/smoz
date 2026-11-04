import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { detectPm, runInstall } from './install';

describe('init/install.detectPm', () => {
  const mk = () => mkdtempSync(join(tmpdir(), 'smoz-install-'));

  it('detects pnpm from lockfile', () => {
    const root = mk();
    try {
      writeFileSync(join(root, 'pnpm-lock.yaml'), '', 'utf8');
      expect(detectPm(root)).toBe('pnpm');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('detects yarn/npm/bun from lockfiles', () => {
    const root = mk();
    try {
      writeFileSync(join(root, 'yarn.lock'), '', 'utf8');
      expect(detectPm(root)).toBe('yarn');
      // remove yarn lock before checking npm precedence
      rmSync(join(root, 'yarn.lock'), { force: true });
      writeFileSync(join(root, 'package-lock.json'), '', 'utf8');
      expect(detectPm(root)).toBe('npm');
      // remove npm lock before checking bun precedence
      rmSync(join(root, 'package-lock.json'), { force: true });
      writeFileSync(join(root, 'bun.lockb'), '', 'utf8');
      expect(detectPm(root)).toBe('bun');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('returns undefined without hints and empty UA', () => {
    const root = mk();
    const prev = process.env.npm_config_user_agent;
    try {
      process.env.npm_config_user_agent = '';
      expect(detectPm(root)).toBeUndefined();
    } finally {
      process.env.npm_config_user_agent = prev;
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('init/install.runInstall', () => {
  it('returns unknown-pm for unsupported pm', () => {
    expect(runInstall(process.cwd(), 'foo')).toBe('unknown-pm');
  });

  it('returns skipped without a pm', () => {
    expect(runInstall(process.cwd())).toBe('skipped');
  });

  // Real npm runs inherit stdio; keep the test output clean.
  const quietNpm = () => {
    const prev = process.env.npm_config_loglevel;
    process.env.npm_config_loglevel = 'silent';
    return () => {
      if (prev === undefined) delete process.env.npm_config_loglevel;
      else process.env.npm_config_loglevel = prev;
    };
  };
  beforeEach(() => quietNpm());

  // Runs real npm (no dependencies, so offline-safe): proves the PATH command
  // spawns on this OS (Windows needs the shell for npm.cmd).
  it('runs npm install in the project root', () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-install-run-'));
    try {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ name: 'smoz-install-probe', version: '1.0.0' }),
        'utf8',
      );
      expect(runInstall(root, 'npm')).toBe('ran (npm)');
      expect(existsSync(join(root, 'package-lock.json'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);

  it('returns failed when the install fails', () => {
    const root = mkdtempSync(join(tmpdir(), 'smoz-install-fail-'));
    try {
      writeFileSync(join(root, 'package.json'), '{ not json', 'utf8');
      expect(runInstall(root, 'npm')).toBe('failed');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
