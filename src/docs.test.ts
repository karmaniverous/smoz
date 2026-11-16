/* REQUIREMENTS ADDRESSED (TEST)
- #35: the docs bootstrap a new app with
  `npx -p @karmaniverous/get-dotenv@^8.0.0-0 -p @karmaniverous/smoz smoz init`;
  nothing tells users to run the nonexistent `smoz init -i`.
- Every bootstrap command brings @karmaniverous/get-dotenv ^8.0.0-0, and
  manual installs put this CLI-only peer in devDependencies (get-dotenv
  Decision 36).
- The `init` options listed in docs-src/cli.md are the command's options.
*/
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { describe, expect, it } from 'vitest';

import { setupSmozCommands } from '@/src/cli/plugins/smoz';
import { repoRoot } from '@/src/test/cliBaseline';

const bootstrap =
  'npx -p @karmaniverous/get-dotenv@^8.0.0-0 -p @karmaniverous/smoz smoz init';

const listMarkdown = (rel: string): string[] =>
  readdirSync(path.join(repoRoot, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? listMarkdown(`${rel}/${e.name}`)
      : e.name.endsWith('.md')
        ? [`${rel}/${e.name}`]
        : [],
  );

const docs = [
  'README.md',
  'CONTRIBUTING.md',
  'templates/default/README.md',
  ...listMarkdown('docs-src'),
];
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');

describe('docs: bootstrap and install commands (#35)', () => {
  it.each(docs)('%s never tells users to run `init -i`', (rel) => {
    expect(read(rel)).not.toMatch(/\binit -i\b/);
  });

  it.each([
    'README.md',
    'docs-src/cli.md',
    'docs-src/getting-started.md',
    'docs-src/why-smoz.md',
  ])('%s bootstraps with get-dotenv ^8.0.0-0', (rel) => {
    expect(read(rel)).toContain(bootstrap);
  });

  it('manual installs keep the CLI-only get-dotenv peer in devDependencies', () => {
    for (const rel of [
      'README.md',
      'docs-src/getting-started.md',
      'docs-src/tour-10-minutes.md',
    ]) {
      const content = read(rel);
      expect(content).toContain('npm i @karmaniverous/smoz zod zod-openapi');
      expect(content).toContain('npm i -D @karmaniverous/get-dotenv@^8.0.0-0');
      expect(content).not.toMatch(
        /npm i @karmaniverous\/smoz .*@karmaniverous\/get-dotenv/,
      );
    }
  });
});

describe('docs: cli.md init options', () => {
  it('lists exactly the options `smoz init` has', () => {
    const cli = new GetDotenvCli('smoz', { importMetaUrl: import.meta.url });
    setupSmozCommands(cli);
    const init = cli.commands.find((c) => c.name() === 'init');
    const actual = (init?.options ?? []).map((o) => o.flags).sort();

    const section = /## init\n([\s\S]*?)\n## /.exec(read('docs-src/cli.md'));
    const documented = [
      ...(section?.[1] ?? '').matchAll(/^- `(-[^`]+)` \u2014/gm),
    ]
      .map((m) => m[1])
      .sort();
    expect(documented).toEqual(actual);
  });
});
