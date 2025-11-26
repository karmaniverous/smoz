# Contributing to SMOZ

Thanks for your interest in contributing!

The full contributor guide lives in the documentation site and this repo’s authored docs:

- Rendered docs: https://docs.karmanivero.us/smoz
- Source guide: [docs-src/contributing.md](docs-src/contributing.md)

Quick start:

```bash
npm i
npm run build               # one-time: builds dist types so editors resolve path aliases
npx smoz register          # (re)generate side-effect registers
npm run openapi            # build app/generated/openapi.json
npm run lint:fixnpm run templates:lint
npm run typecheck
npm run templates:typecheck
npm test
```

Please open an issue for design discussions before large changes.
