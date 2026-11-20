/**
 * Listed departures from the smoz 0.4.1 CLI baseline (get-dotenv 7.0.11).
 *
 * The baseline test compares every part of every case (see `caseParts` in
 * `src/test/cliBaseline.ts`) with the recorded output, except the parts listed
 * here. Every entry names the smoz issue (`#NN`), get-dotenv issue
 * (`get-dotenv#NN`) or get-dotenv spec decision (`DNN`) that changes it. An
 * entry whose part no longer differs fails, so the list stays exact. The
 * baseline itself is never re-recorded to make a test pass.
 */

/** One accepted departure from the baseline. */
export interface Departure {
  /** Case id, as in `baselineCases`. */
  case: string;
  /**
   * Part of the case: `exit`, `text`, `header`, `usage`, `description`,
   * `section:<heading>`, `files` or `package.json:<key>`.
   */
  part: string;
  /** The issue or get-dotenv spec decision that causes the change. */
  issueOrDecision: `#${number}` | `get-dotenv#${number}` | `D${number}`;
  /** What changes, in a sentence. */
  note: string;
}

/** Subcommand help cases. */
const subcommandHelp = [
  'help-init',
  'help-add',
  'help-register',
  'help-openapi',
  'help-dev',
  'help-aws',
  'help-cmd',
  'help-batch',
  'help-batch-cmd',
];

/** The departures, by cause. */
export const departures: Departure[] = [
  // #33: smoz's own identity (get-dotenv 8 `importMetaUrl`, D23).
  ...['help-root', ...subcommandHelp].map((id): Departure => ({
    case: id,
    part: 'header',
    issueOrDecision: '#33',
    note: "The help header shows smoz's version, not get-dotenv's.",
  })),
  {
    case: 'help-root',
    part: 'description',
    issueOrDecision: '#33',
    note: "Root help shows smoz's package description, not get-dotenv's 'Base CLI.'.",
  },
  {
    case: 'version',
    part: 'text',
    issueOrDecision: '#33',
    note: "-V prints smoz's version, not get-dotenv's.",
  },
  // get-dotenv 8 help layout.
  {
    case: 'help-root',
    part: 'section:Options',
    issueOrDecision: 'get-dotenv#76',
    note: 'Root help lists -h, --help and -V, --version.',
  },
  ...subcommandHelp
    .filter((id) => id !== 'help-batch-cmd')
    .map((id): Departure => ({
      case: id,
      part: 'section:Options',
      issueOrDecision: 'D27',
      note: 'Subcommand help lists -h, --help in its own options.',
    })),
  ...subcommandHelp.map((id): Departure => ({
    case: id,
    part: 'section:smoz options (anywhere)',
    issueOrDecision: 'D27',
    note: "Subcommand help adds the root's options as qualified names (--smoz-env).",
  })),
  {
    case: 'help-batch-cmd',
    part: 'section:smoz batch options (anywhere)',
    issueOrDecision: 'D27',
    note: "batch cmd help adds batch's options as qualified names.",
  },
  {
    case: 'help-batch-cmd',
    part: 'description',
    issueOrDecision: 'get-dotenv#65',
    note: "batch cmd is no longer batch's default subcommand.",
  },
  // get-dotenv as an optional peer: the app template brings it.
  {
    case: 'init',
    part: 'package.json:devDependencies',
    issueOrDecision: 'D36',
    note: 'The app gets @karmaniverous/get-dotenv ^8.0.0 as a devDependency, so its smoz bin runs.',
  },
  // The app's smoz dependency tracks the running smoz version, so it departs
  // from 0.4.1 with every release (v0.5.0 turned main's CI red; fixed in #39).
  {
    case: 'init',
    part: 'package.json:dependencies',
    issueOrDecision: '#39',
    note: 'The app depends on the running smoz version (^0.5.0 and later), not ^0.4.1.',
  },
  // Dependency updates.
  {
    case: 'init',
    part: 'package.json:devDependencies',
    issueOrDecision: 'D39',
    note: 'Template dependency updates: eslint, prettier, typescript-eslint, and serverless-domain-manager 11 (a major approved at the lock).',
  },
];
