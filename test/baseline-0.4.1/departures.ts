/**
 * Listed departures from the smoz 0.4.1 CLI baseline (get-dotenv 7.0.11).
 *
 * The baseline test compares every part of every case (see `caseParts` in
 * `src/test/cliBaseline.ts`) with the recorded output, except the parts listed
 * here. Every entry names the issue (`#NN`) or get-dotenv spec decision (`DNN`)
 * that changes it. An entry whose part no longer differs fails, so the list
 * stays exact. The baseline itself is never re-recorded to make a test pass.
 */

/** One accepted departure from the baseline. */
export interface Departure {
  /** Case id, as in `baselineCases`. */
  case: string;
  /** Part of the case: `exit`, `text`, `header`, `usage`, `description` or `section:<heading>`. */
  part: string;
  /** The smoz issue (`#NN`) or get-dotenv spec decision (`DNN`) that causes the change. */
  issueOrDecision: `#${number}` | `D${number}`;
  /** What changes, in a sentence. */
  note: string;
}

/** The departures, by case. */
export const departures: Departure[] = [];
