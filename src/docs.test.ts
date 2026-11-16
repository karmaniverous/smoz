/* REQUIREMENTS ADDRESSED (TEST)
- #35: the docs bootstrap a new app with
  `npx -p @karmaniverous/get-dotenv@^8 -p @karmaniverous/smoz smoz init`;
  nothing tells users to run the nonexistent `smoz init -i`.
- Every command that installs or runs the published smoz package also brings
  @karmaniverous/get-dotenv ^8, which the smoz CLI needs (get-dotenv
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
  'npx -p @karmaniverous/get-dotenv@^8 -p @karmaniverous/smoz smoz init';

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
  ])('%s bootstraps with get-dotenv ^8', (rel) => {
    expect(read(rel)).toContain(bootstrap);
  });

  it.each(docs)(
    '%s installs or runs published smoz only with get-dotenv ^8',
    (rel) => {
      const lines = read(rel)
        .split(/\r?\n/)
        .filter(
          (l) =>
            /\b(npm (i|install|add)|npx|pnpm add|yarn add)\b/.test(l) &&
            l.includes('@karmaniverous/smoz'),
        );
      for (const line of lines)
        expect(line, `${rel}: ${line}`).toContain(
          '@karmaniverous/get-dotenv@^8',
        );
    },
  );

  it('the README and getting-started install commands include get-dotenv ^8', () => {
    for (const rel of ['README.md', 'docs-src/getting-started.md']) {
      expect(read(rel)).toMatch(
        /npm i @karmaniverous\/smoz @karmaniverous\/get-dotenv@\^8/,
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
