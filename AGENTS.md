# AGENTS.md

Standing rules for every agent (human or AI) working on a pull request in this repository. [CONTRIBUTING.md](CONTRIBUTING.md) and [docs-src/contributing.md](docs-src/contributing.md) cover setup and conventions; these rules sit on top of them. While the get-dotenv 8.0.0 work is open (step S16 of its dev plan: one branch, `feature/gh-33-get-dotenv-8`, and one PR), they apply to every commit on it, and they stay until replaced.

## Source of truth

- The issue a PR closes, and any owner decisions recorded on it, are the source of truth. For the get-dotenv 8.0 work it is the locked get-dotenv product spec (its 8.0.0 Next Version section, decisions and dev plan, step S16), together with [get-dotenv's migration guide](https://github.com/karmaniverous/get-dotenv/blob/main/guides/migrating-to-8.md) and its [packaging guide](https://github.com/karmaniverous/get-dotenv/blob/main/guides/authoring/packaging.md).
- Owner decisions are constraints: never reverse one in code. If the code contradicts the issue or the spec, or a decision looks wrong, stop and report it. Don't change the spec from a PR.
- Do only the step you were given.

## Step gate

Every step ends with this gate. It is enforced through the PR progress table: a step can't be ticked until all six columns are filled.

1. **SOLID/DRY** over the step's own diff: one responsibility per module, shared logic in one place, no copy-paste. Behaviour-preserving refactors go in their own commit, proven by unchanged tests and mutation results.
2. **Tests land in the same step.** Every issue the step covers gets a regression test from the issue's repro, shown to fail on the step's parent commit and pass on the fix, with both SHAs recorded. Every new module or changed function gets a mutation check (break the code, a test must fail), with the mutants and results recorded. No trivial tests (asserting a constant, a mock or a type).
3. **Docs land in the same step.** `git grep` `README.md`, `docs-src/**`, `CONTRIBUTING.md`, the template (`templates/default/**`) and TSDoc for every option, command, script and dependency the step adds, renames or removes, and update every hit. Every new export gets TSDoc, so `npm run docs` stays at 0 warnings.
4. **Baseline.** Any change to the recorded CLI baseline (`--help` of every command, `init` output) is a listed departure that names its issue or decision. Never re-record a baseline to make a test pass without listing why.
5. **Gates** (below), then the PR-state check, push, and CI.
6. **Record it.** Tick the step in the PR progress table, with commit SHAs, regression-test red/green SHAs, mutation results and the docs files touched.

## Gates (before every push)

Run from the repo root, in this order (the template checks need `dist`). Every gate must pass with **zero errors and zero warnings**:

```bash
npm run lint
npm run typecheck
npm test
npm run knip
npm run build
npm run templates:typecheck
npm run templates:lint
npm run format:check
npm run docs
npm audit --omit=dev --audit-level=high
```

- After the build, run `node dist/cli/index.mjs --help` and `node dist/cli/index.mjs -V`.
- CI (`.github/workflows/ci.yml`) runs the same gates and must be green on the pushed head, on both the Linux and Windows jobs.
- A gate that already fails on `main` is not "pre-existing" and is not out of scope. Fix it in the PR, or stop and report it.

### get-dotenv 8 before it is published

Until `@karmaniverous/get-dotenv@8.0.0` is on npm, `package.json` declares it as `^8.0.0` (optional peer and devDependency) while the committed lockfile can't resolve that range, so CI fails at `npm ci`. That is expected and planned: the lockfile is refreshed once 8.0.0 is published (dev plan S26). Meanwhile:

- Pack get-dotenv from its branch (`npm pack`) and install the tarball locally with `npm install --no-save <tgz>`. Never commit a `file:` reference or a lockfile entry that points at a tarball.
- Run every gate locally against the tarball, and say in the PR which get-dotenv commit it was packed from.
- Any later `npm install` restores the lockfile's copy: reinstall the tarball afterwards.

## Finishing step

The finishing step runs the `jeeves-pr-review` passes. Their results go in the finishing table in the PR description, one row per pass. The PR stays in draft while any row is blank.

| Pass                   | What it checks                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness           | Every item in the step's Covers column, every spec checklist item this repo owns and every issue the PR closes, traced to the code and the test that proves it. |
| SOLID/DRY              | Over the whole PR diff.                                                                                                                                         |
| Test adequacy          | Coverage for each touched file is at least its baseline on `main`, new files have their own coverage, a mutation check per new module, and no trivial tests.    |
| Docs sync              | README and `docs-src/**` checked against the code. TypeDoc has 0 warnings.                                                                                      |
| Independent review     | By a fresh subagent with no shared context, posted as a GitHub review. Every finding is fixed or answered.                                                      |
| Gates + CI + mergeable | All gates green on the pushed head (locally against the get-dotenv tarball until 8.0.0 is published), and the PR is mergeable.                                  |

## Tests

- Check coverage of every touched source file before and after the change (`npx vitest run <dirs> --coverage --coverage.include=<glob>`). Coverage of a touched file must not fall; target 90% branches or state the reason in the PR body.
- Documented behaviour of a dependency that the docs promise to users is pinned by a test, so the docs fail loudly if the dependency changes.

## Lint, types and skips

- **Never** use `eslint-disable` in production code, and never add `@ts-ignore`/`@ts-expect-error`, `ignoreDeprecations`, lint `ignores`, or any weakening of a lint, typecheck, knip or coverage rule. Fix the code.
- In tests only, a single line may carry `eslint-disable-next-line <rule> -- <why>` when the test genuinely can't be written another way. List every such line in the PR description.
- No test is skipped silently. A skip is explicit in code (`it.skipIf(...)`/`it.runIf(...)`) with a comment giving the reason, and it is listed in the PR description.

## Design

- Optional peer dependencies stay optional. `@karmaniverous/get-dotenv` is an optional peer: the main entry (`.`), `./http` and `./serverless-plugin` never import it, not even with `import type`. The get-dotenv plugin lives in `./cli`, and the `smoz` bin is a launcher that loads the CLI with a dynamic `import()` and prints an install hint when get-dotenv is missing.
- Any other optional peer is loaded with a dynamic `import()` that handles rejection (bundlers such as esbuild fail on an unhandled unresolvable import).
- Never bump the `package.json` version, and never change release configuration beyond what the PR's issue asks for. Put needed releases and their order in the PR body.

## Git and PRs

- Branch names follow `.lefthook/pre-commit/branch-naming-policy` (`feature/`, `bugfix/`, `chore/`, `docs/`, `hotfix/`; no dots). Put the issue number first (`feature/gh-33-...`) so the `add-issue` commit hook prefixes `[GH-33]`. That prefix is intended: commit normally, and never skip or exclude a hook.
- Conventional Commits. Commit in logical steps, and **push after every commit**.
- Immediately before **every** push, run:

  ```bash
  gh pr list --repo karmaniverous/smoz --head <branch> --state all --json number,state
  ```

  If the newest PR on the branch is `MERGED` or `CLOSED`, stop and report; don't push.

- Open PRs as drafts with `--reviewer karmaniverous`.
- **Never merge a PR, publish, tag, release or change the package version.** Those are the owner's.
