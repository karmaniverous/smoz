/* REQUIREMENTS ADDRESSED (TEST)
- The smoz CLI host is exercised in-process as well as through child-process
  help/version baselines, so coverage sees the get-dotenv wiring in run.ts.
- `runSmoz()` reads process.argv and reports smoz's own version (#33).
*/
import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { runSmoz } from './run';

const version = (
  JSON.parse(readFileSync('package.json', 'utf8')) as {
    version: string;
  }
).version;

describe('runSmoz', () => {
  it('runs the branded smoz host from process.argv in-process', async () => {
    const argv = process.argv;
    process.argv = [process.execPath, 'smoz', '-V'];
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
    try {
      await runSmoz();
      expect(String(write.mock.calls[0]?.[0]).trim()).toBe(version);
      expect(exit).toHaveBeenCalledWith(0);
    } finally {
      process.argv = argv;
      write.mockRestore();
      exit.mockRestore();
    }
  });
});
