/* REQUIREMENTS ADDRESSED (TEST)
- The inline dev server serves container image functions from the
  image.command SMOZ defaults to the derived handler (#19), and skips image
  functions whose handler it can't find with a clear notice.
*/
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { loadHandlers } from './routes';

describe('inline.server/routes.loadHandlers', () => {
  let root = '';
  const handlerRef = 'fns/hello/handler.handler';
  const events = (p: string) => [{ http: { method: 'get', path: p } }];

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'smoz-routes-'));
    mkdirSync(path.join(root, 'fns', 'hello'), { recursive: true });
    writeFileSync(
      path.join(root, 'fns', 'hello', 'handler.ts'),
      'export const handler = async () => ({ statusCode: 200, body: "hi" });\n',
      'utf8',
    );
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const load = async (fns: Record<string, unknown>) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const routes = await loadHandlers(root, {
        buildAllServerlessFunctions: () => fns,
      });
      return { routes, warnings: warn.mock.calls.map((c) => String(c[0])) };
    } finally {
      warn.mockRestore();
    }
  };

  it('serves handler functions and image functions via image.command', async () => {
    const { routes, warnings } = await load({
      plain: { handler: handlerRef, events: events('/plain') },
      boxed: {
        image: { uri: 'repo:tag', command: [handlerRef] },
        events: events('/boxed'),
      },
    });
    expect(
      routes.map((r) => `${r.method} ${r.pattern} ${r.handlerRef}`),
    ).toEqual([`GET /plain ${handlerRef}`, `GET /boxed ${handlerRef}`]);
    expect(await routes[1]!.handler({} as never, {} as never)).toEqual({
      statusCode: 200,
      body: 'hi',
    });
    expect(warnings).toEqual([]);
  });

  it('skips a string image with a notice', async () => {
    const { routes, warnings } = await load({
      boxed: { image: 'repo@sha256:abc', events: events('/boxed') },
    });
    expect(routes).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(
      /Skipping "boxed".*doesn't name a handler module/,
    );
  });

  it('skips an image whose command is not a project module, with a notice', async () => {
    const { routes, warnings } = await load({
      boxed: {
        image: { name: 'img', command: ['dist/main.handler'] },
        events: events('/boxed'),
      },
    });
    expect(routes).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(
      /Skipping "boxed": image\.command "dist\/main\.handler" is not a handler module/,
    );
  });

  it('skips missing exports and non-HTTP events; defaults the export to handler', async () => {
    const { routes } = await load({
      missingExport: {
        handler: 'fns/hello/handler.nope',
        events: events('/x'),
      },
      noDot: {
        handler: 'fns/hello/handler',
        events: [{ sqs: { arn: 'arn:q' } }, ...events('/nodot')],
      },
    });
    expect(
      routes.map((r) => `${r.method} ${r.pattern} ${r.handlerRef}`),
    ).toEqual(['GET /nodot fns/hello/handler.handler']);
  });

  it('silently skips non-image functions without a handler or events', async () => {
    const { routes, warnings } = await load({
      noHandler: { events: events('/x') },
      noEvents: { handler: handlerRef },
    });
    expect(routes).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
