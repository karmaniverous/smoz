/* REQUIREMENTS ADDRESSED (TEST)
- `smoz init` + `npm install` must resolve: every template dependency that
  SMOZ declares as a peer satisfies SMOZ's peer range.
- The default template ships HTTP functions, so it lists every peer the HTTP
  runtime imports, and the optional peers SMOZ's public types import
  (zod-openapi, @serverless/typescript); only opt-in peers may be left out.
- The template's engines.node equals SMOZ's.
*/
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type Manifest = {
  engines?: Record<string, string>;
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

type Version = [number, number, number];

/** Compare two versions: negative, zero or positive. */
const compare = (a: Version, b: Version): number =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/**
 * Bounds `[floor, ceiling)` of a caret range `^X.Y.Z` (the only form these
 * manifests use). The caret allows changes that don't touch the left-most
 * non-zero part: `^1.2.3` is `<2.0.0`, `^0.2.3` is `<0.3.0` and `^0.0.3` is
 * `<0.0.4`.
 */
const caret = (range: string): [Version, Version] => {
  const m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  if (!m) throw new Error(`Expected a ^X.Y.Z range, got "${range}"`);
  const floor = m.slice(1).map(Number) as Version;
  const [maj, min, pat] = floor;
  const ceiling: Version =
    maj > 0 ? [maj + 1, 0, 0] : min > 0 ? [0, min + 1, 0] : [0, 0, pat + 1];
  return [floor, ceiling];
};

/**
 * True when every version allowed by caret range `inner` is allowed by
 * caret range `outer`.
 */
const caretWithin = (inner: string, outer: string): boolean => {
  const [iFloor, iCeil] = caret(inner);
  const [oFloor, oCeil] = caret(outer);
  return compare(iFloor, oFloor) >= 0 && compare(iCeil, oCeil) <= 0;
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

  it('treats ^0.y.z as a minor range and ^0.0.z as a single patch', () => {
    expect(caretWithin('^0.3.1', '^0.3.0')).toBe(true);
    expect(caretWithin('^0.4.0', '^0.3.0')).toBe(false);
    expect(caretWithin('^0.3.0', '^0.3.1')).toBe(false);
    expect(caretWithin('^0.0.3', '^0.0.3')).toBe(true);
    expect(caretWithin('^0.0.4', '^0.0.3')).toBe(false);
    expect(caretWithin('^0.0.3', '^0.0.2')).toBe(false);
    // 0.0.3 is below ^0.3.0's floor; ^0.3.0 allows far more than 0.0.3.
    expect(caretWithin('^0.0.3', '^0.3.0')).toBe(false);
    expect(caretWithin('^0.3.0', '^0.0.3')).toBe(false);
    expect(caretWithin('^1.0.0', '^0.9.0')).toBe(false);
  });
});

describe('templates/default/package.json engines', () => {
  it('requires the same Node versions as SMOZ', () => {
    expect(template.engines?.node).toBe(smoz.engines?.node);
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
