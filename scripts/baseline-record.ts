/**
 * Record the CLI baseline corpus (see `src/test/cliBaseline.ts`).
 *
 * Usage: `tsx scripts/baseline-record.ts <outDir>`. The committed baseline in
 * `test/baseline-0.4.1/` was recorded from smoz 0.4.1 (get-dotenv 7.0.11) on
 * win32 and is never re-recorded: a change is listed in `departures.ts`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { baselineCases, recordCase } from '../src/test/cliBaseline';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: tsx scripts/baseline-record.ts <outDir>');
mkdirSync(outDir, { recursive: true });
await Promise.all(
  baselineCases.map(async (c) => {
    writeFileSync(path.join(outDir, `${c.id}.txt`), await recordCase(c));
  }),
);
console.log(`recorded ${String(baselineCases.length)} cases in ${outDir}`);
