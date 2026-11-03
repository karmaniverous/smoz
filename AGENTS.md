# AGENTS.md

Standing rules for every agent (human or AI) opening a pull request in this repository. [CONTRIBUTING.md](CONTRIBUTING.md) and [docs-src/contributing.md](docs-src/contributing.md) cover setup and conventions; these rules sit on top of them.

## Source of truth

- The issue the PR closes, and any owner decisions recorded on it, are the source of truth. Owner decisions are constraints: never reverse one in code. If the code contradicts the issue, or a decision looks wrong, stop and report it.

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
npm audit --omit=dev
```

- CI (`.github/workflows/ci.yml`) runs the same gates and must be green on the pushed head.
- A gate that already fails on `main` is not "pre-existing" and is not out of scope. Fix it in the PR, or stop and report it before asking for review. Never present a PR while any gate fails.
- **Never** add `eslint-disable` comments, `@ts-ignore`/`@ts-expect-error`, `ignoreDeprecations`, lint `ignores`, or any weakening of a lint, typecheck, knip or coverage rule. Fix the code.
- No test is skipped silently. A skip must be explicit in code (`it.skipIf(...)`/`it.runIf(...)` with a comment giving the reason) and justified in the PR body.

## Tests

- Every behaviour change ships with tests that would fail without it. No trivial tests (asserting a constant, a mock or a type).
- Check coverage of every touched source file before and after the change (`npx vitest run <dirs> --coverage --coverage.include=<glob>`). Coverage of a touched file must not fall; target 90% branches or state the reason in the PR body.
- Run a mutation check on new logic and error paths (break the condition, confirm a test fails, restore).
- Documented behaviour of a dependency that the docs promise to users is pinned by a test, so the docs fail loudly if the dependency changes.

## Design

- Review the diff for SOLID and DRY before calling it done: one responsibility per module, shared logic in one place, no copy-paste.
- Optional peer dependencies must stay optional: no static runtime import, and a dynamic `import()` must handle rejection (bundlers such as esbuild fail on an unhandled unresolvable import).
- Never bump the `package.json` version, and never change release configuration beyond what the PR's issue asks for. Put needed releases and their order in the PR body.

## Docs

- Update the docs the change affects in the same PR: `README.md`, `docs-src/**` (guides, recipes, `contributing.md`), `CONTRIBUTING.md`, the template (`templates/default/**`), and TSDoc on exported API. Grep the docs for every option, script, step id and dependency you add, rename or remove.

## Git and PRs

- Branch names follow `.lefthook/pre-commit/branch-naming-policy` (`feature/`, `bugfix/`, `chore/`, `docs/`, `hotfix/`; no dots). Put the issue number first (`feature/20-...`) so the commit hook prefixes `[20]`.
- Conventional Commits. Commit in logical steps, and **push after every commit**.
- Immediately before **every** push, run `gh pr list --head <branch> --state all --json number,state`. If the newest PR on the branch is `MERGED` or `CLOSED`, stop and report; do not push.
- Open PRs with `--reviewer karmaniverous`. Keep a PR in draft until the gates, an independent review of the diff, and CI are all green, and every review finding is fixed.
- **Never merge a PR, publish, tag or release.** Those are the owner's.
