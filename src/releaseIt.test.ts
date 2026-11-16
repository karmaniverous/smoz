/* REQUIREMENTS ADDRESSED (TEST)
- #18: GitHub releases are named `smoz@<version>` (the package name without
  its scope), and their notes are git-cliff's for the version being released.

The `github` block is merged over release-it's own defaults, as release-it
merges it, and its templates are rendered by release-it's own `format()` (Eta,
`${...}` tags) with the context release-it gives them. The release notes
command is then run (git-cliff, the repo's `cliff.toml`) in a throwaway
repository, both before the release tag exists (release-it's `beforeRelease`)
and after it.
*/
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { repoRoot } from '@/src/test/cliBaseline';

interface GithubConfig {
  releaseName: string;
  releaseNotes: string | null;
}

interface PackageJson {
  name: string;
  'release-it': { github: Partial<GithubConfig> };
}

const pkg = JSON.parse(
  readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
) as PackageJson;

const releaseItRoot = path.dirname(
  fileURLToPath(import.meta.resolve('release-it/package.json')),
);

/** release-it's defaults (`config/release-it.json`). */
const defaults = JSON.parse(
  readFileSync(path.join(releaseItRoot, 'config', 'release-it.json'), 'utf8'),
) as { github: GithubConfig };

/** The effective `github` options: the local config over the defaults. */
const github: GithubConfig = {
  ...defaults.github,
  ...pkg['release-it'].github,
};

type Format = (template: string, context: Record<string, unknown>) => string;

/** release-it's template renderer (not exported; loaded by file URL). */
let format: Format;

/** git-cliff's CLI entry. */
const cliffCli = fileURLToPath(import.meta.resolve('git-cliff/cli'));

let repo: string;

const git = (...args: string[]): string =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release-test@example.com',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'tag.gpgsign=false',
      ...args,
    ],
    { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

/**
 * Render the release notes command for `context` and run it in `repo`, as
 * release-it's `beforeRelease` does (`npx git-cliff ...`, run with the local
 * git-cliff).
 */
const releaseNotes = (context: Record<string, unknown>): string => {
  expect(typeof github.releaseNotes).toBe('string');
  const command = format(github.releaseNotes as string, context);
  expect(command).toMatch(/^npx git-cliff /);
  expect(command).not.toMatch(/["'\\]/); // plain words: split on spaces
  const args = command.split(' ').slice(2);
  return execFileSync(process.execPath, [cliffCli, ...args], {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
};

beforeAll(async () => {
  ({ format } = (await import(
    pathToFileURL(path.join(releaseItRoot, 'lib', 'util.js')).href
  )) as { format: Format });
  repo = mkdtempSync(path.join(os.tmpdir(), 'smoz-release-'));
  copyFileSync(
    path.join(repoRoot, 'cliff.toml'),
    path.join(repo, 'cliff.toml'),
  );
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '-m', 'feat: first feature');
  // smoz tags are bare versions (release-it's default tagName).
  git('tag', '1.0.0');
  // The add-issue hook prefixes commit messages with the branch's issue.
  git('commit', '-q', '--allow-empty', '-m', '[GH-18] fix: second fix');
  git('commit', '-q', '--allow-empty', '-m', 'chore: release v1.1.0');
}, 60_000);

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('release-it config (#18)', () => {
  it('names the GitHub release smoz@<version>', () => {
    const name = format(github.releaseName, {
      name: pkg.name,
      version: '0.5.0',
    });
    expect(pkg.name).toBe('@karmaniverous/smoz');
    expect(name).toBe('smoz@0.5.0');
  });

  it('release notes cover the version being released, before its tag exists', () => {
    // release-it's context in beforeRelease: the new version; latestTag is
    // still the previous release.
    const notes = releaseNotes({ version: '1.1.0', latestTag: '1.0.0' });
    expect(notes).toMatch(
      /^## \[1\.1\.0\]\(.*\/compare\/1\.0\.0\.\.\.1\.1\.0\)/,
    );
    // The issue prefix is stripped, so the commit is grouped by its type.
    expect(notes).toMatch(/### Bug Fixes\s+- Second fix/);
    expect(notes).not.toContain('First feature');
    expect(notes).not.toContain('release v1.1.0');
    expect(notes).not.toContain('[Unreleased]');
    expect(notes).not.toContain('# Changelog');
  });

  it('release notes still cover the release once its tag exists', () => {
    git('tag', '1.1.0');
    try {
      const notes = releaseNotes({ version: '1.1.0', latestTag: '1.0.0' });
      expect(notes).toMatch(/^## \[1\.1\.0\]/);
      expect(notes).toContain('Second fix');
      expect(notes).not.toContain('First feature');
    } finally {
      git('tag', '-d', '1.1.0');
    }
  });

  it('uses the preceding prerelease in a sequential-prerelease compare link', () => {
    const head = git('rev-parse', 'HEAD').trim();
    git('tag', '1.1.0-0');
    git(
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      '[GH-18] fix: prerelease follow-up',
    );
    try {
      const notes = releaseNotes({
        version: '1.1.0-1',
        latestTag: '1.1.0-0',
      });
      expect(notes).toMatch(
        /^## \[1\.1\.0-1\]\(.*\/compare\/1\.1\.0-0\.\.\.1\.1\.0-1\)/,
      );
      expect(notes).toContain('Prerelease follow-up');
    } finally {
      git('reset', '--hard', head);
      git('tag', '-d', '1.1.0-0');
    }
  });
});
