/* REQUIREMENTS ADDRESSED (TEST)
- `smoz init` + `npm install` must resolve: every template dependency that
  SMOZ declares as a peer satisfies SMOZ's peer range.
- The default template ships HTTP functions, so it lists every peer the HTTP
  runtime imports; only opt-in peers may be left out.
*/
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const readManifest = (rel: string) =>
  JSON.parse(
    readFileSync(path.resolve(process.cwd(), rel), 'utf8'),
  ) as Manifest;

const smoz = readManifest('package.json');
const template = readManifest('templates/default/package.json');
const templateDeps = {
  ...template.devDependencies,
  ...template.dependencies,
};
const peers = Object.entries(smoz.peerDependencies ?? {});

/** Peers the default template's functions don't use (opt-in features). */
const optInPeers = new Set(['@middy/http-multipart-body-parser']);

/** Parse a caret range `^X.Y.Z` (the only form these manifests use). */
const caret = (range: string) => {
  const m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  if (!m) throw new Error(`Expected a ^X.Y.Z range, got "${range}"`);
  return m.slice(1).map(Number) as [number, number, number];
};

/**
 * True when every version allowed by caret range `inner` is allowed by
 * caret range `outer` (same major, and inner's floor at or above outer's).
 */
const caretWithin = (inner: string, outer: string): boolean => {
  const [iMaj, iMin, iPat] = caret(inner);
  const [oMaj, oMin, oPat] = caret(outer);
  if (iMaj !== oMaj) return false;
  if (iMin !== oMin) return iMin > oMin;
  return iPat >= oPat;
};

describe('caretWithin', () => {
  it('compares major, then minor, then patch', () => {
    expect(caretWithin('^7.7.0', '^7.7.0')).toBe(true);
    expect(caretWithin('^7.8.0', '^7.7.5')).toBe(true);
    expect(caretWithin('^7.7.1', '^7.7.0')).toBe(true);
    expect(caretWithin('^7.6.9', '^7.7.0')).toBe(false);
    expect(caretWithin('^7.7.0', '^7.7.1')).toBe(false);
    expect(caretWithin('^6.4.5', '^7.7.0')).toBe(false);
    expect(caretWithin('^8.0.0', '^7.7.0')).toBe(false);
  });
});

describe('templates/default/package.json vs SMOZ peers', () => {
  it('lists every non-opt-in peer', () => {
    const missing = peers
      .map(([name]) => name)
      .filter((name) => !optInPeers.has(name) && !(name in templateDeps));
    expect(missing).toEqual([]);
  });

  it.each(peers.filter(([name]) => name in templateDeps))(
    '%s satisfies the peer range %s',
    (name, peerRange) => {
      expect(caretWithin(templateDeps[name]!, peerRange)).toBe(true);
    },
  );
});
