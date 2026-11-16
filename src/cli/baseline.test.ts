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
  await Promise.all(
    baselineCases.map(async (c) => {
      current.set(c.id, await recordCase(c));
    }),
  );
}, 180_000);

describe('CLI baseline (smoz 0.4.1)', () => {
  it.each(baselineCases)(
    '$id matches the baseline or a listed departure',
    (c) => {
      const before = caseParts(c.kind, readBaseline(c.id));
      const after = caseParts(c.kind, current.get(c.id) ?? '');
      const listed = new Set(
        departures.filter((d) => d.case === c.id).map((d) => d.part),
      );
      for (const part of new Set([
        ...Object.keys(before),
        ...Object.keys(after),
      ])) {
        if (listed.has(part)) {
          // A listed departure must still be a departure.
          expect(after[part], `${c.id} ${part} (stale departure)`).not.toBe(
            before[part],
          );
        } else {
          expect(after[part], `${c.id} ${part}`).toBe(before[part]);
        }
      }
      for (const part of listed) {
        expect(part in before || part in after, `${c.id} ${part}`).toBe(true);
      }
    },
  );

  it('lists departures only for known cases, each with a note', () => {
    const ids = new Set(baselineCases.map((c) => c.id));
    for (const d of departures) {
      expect(ids.has(d.case), d.case).toBe(true);
      expect(d.note.trim()).not.toBe('');
    }
  });
});
