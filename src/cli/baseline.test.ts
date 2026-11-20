/* REQUIREMENTS ADDRESSED (TEST)
- The CLI's commands, options, version and `init` output match the smoz 0.4.1
  baseline (test/baseline-0.4.1/), except for the listed departures.
*/
import { beforeAll, describe, expect, it } from 'vitest';

import {
  baselineCases,
  caseParts,
  readBaseline,
  recordCase,
} from '@/src/test/cliBaseline';
import { departures } from '@/test/baseline-0.4.1/departures';

const current = new Map<string, string>();

beforeAll(async () => {
  // A few at a time: each case is a tsx process, and the other test files
  // run alongside.
  const queue = [...baselineCases];
  const worker = async () => {
    for (let c = queue.shift(); c; c = queue.shift())
      current.set(c.id, await recordCase(c));
  };
  await Promise.all([worker(), worker(), worker()]);
}, 300_000);

describe('CLI baseline (smoz 0.4.1)', () => {
  it.each(baselineCases)(
    '$id matches the baseline or a listed departure',
    (c) => {
      const before = caseParts(c.kind, readBaseline(c.id));
      const after = caseParts(c.kind, current.get(c.id) ?? '');
      const listed = new Set(
        departures.filter((d) => d.case === c.id).map((d) => d.part),
      );
      const parts = [
        ...new Set([...Object.keys(before), ...Object.keys(after)]),
      ];
      const pick = (
        rec: Record<string, string>,
        keep: (p: string) => boolean,
      ) => Object.fromEntries(parts.filter(keep).map((p) => [p, rec[p]]));
      // Every part not listed as a departure is unchanged (diffs show values).
      expect(pick(after, (p) => !listed.has(p))).toEqual(
        pick(before, (p) => !listed.has(p)),
      );
      // A listed departure must still be a departure, of a part that exists.
      expect(
        [...listed].filter(
          (p) => !(p in before || p in after) || after[p] === before[p],
        ),
      ).toEqual([]);
    },
  );

  it('lists departures only for known cases, each with a note', () => {
    const ids = new Set(baselineCases.map((c) => c.id));
    const unknownCases = departures
      .filter((d) => !ids.has(d.case))
      .map((d) => d.case);
    const emptyNoteCases = departures
      .filter((d) => d.note.trim() === '')
      .map((d) => d.case);
    expect(unknownCases).toEqual([]);
    expect(emptyNoteCases).toEqual([]);
  });
});
