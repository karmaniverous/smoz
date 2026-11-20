# Changelog

All notable changes to this project will be documented in this file.

## [0.6.0](https://github.com/karmaniverous/smoz/compare/0.5.0...0.6.0) - 2026-11-20

### 🚀 Features

- *(types)* [**breaking**] Shape handler events from the schema output; type options.env per function ([8183cef](https://github.com/karmaniverous/smoz/commit/8183ceff96acfcfba5e171fd023d8fb04b8d1415))
- *(template)* [**breaking**] No casts in the template or smoz add stubs; scaffold a literal eventType ([5310350](https://github.com/karmaniverous/smoz/commit/5310350561320144c23d97bcf4f82a8aba35f440))
- *(types)* [**breaking**] Handlers return the response schema input ([1a7206d](https://github.com/karmaniverous/smoz/commit/1a7206d9845888f444c257baf8d706b48f7b93ea))

### 🐛 Bug Fixes

- *(runtime)* [**breaking**] Handlers receive the parsed event; non-HTTP functions enforce their schemas ([3b0e2d7](https://github.com/karmaniverous/smoz/commit/3b0e2d7e4bbc5e89ad58b6e79eb1ecb2111a5812))
- *(types)* Overlay only declared schema keys (z.object({}) and loose objects keep the base event) ([ed0d6d1](https://github.com/karmaniverous/smoz/commit/ed0d6d16f0033308bcd5d150c1d6fb9bab3a2d69))
- *(types)* Env key parameters default to never; shorten App.create overloads ([af14d02](https://github.com/karmaniverous/smoz/commit/af14d0289ae32565d4880ce3caf17cf9c4c5563f))
- *(runtime)* Never log validated payloads; pin that responses are returned untransformed ([6b4e908](https://github.com/karmaniverous/smoz/commit/6b4e908a2700ce701d28e08a37841549167b8eed))
- *(http)* [**breaking**] Answer a response that fails responseSchema with 500, not 400 ([e8654ce](https://github.com/karmaniverous/smoz/commit/e8654ce5bae58516118987d49df299c347ee4424))
- *(cli)* Smoz add formats with the app's own Prettier config ([0450370](https://github.com/karmaniverous/smoz/commit/04503701547dae5d2bfae983b7d96f0e5c7e55ef))

### 💼 Other

- Updated dependencies ([7f8a883](https://github.com/karmaniverous/smoz/commit/7f8a883486329baaedfd9d21d09db4d4a24735f0))

### 🚜 Refactor

- *(core)* Move AppInit to its own module ([5b264c6](https://github.com/karmaniverous/smoz/commit/5b264c620a7170c1cb2aa7ae64b684b7561e1197))
- *(http)* Split error and body steps out of defaultSteps; statusForError ([9974502](https://github.com/karmaniverous/smoz/commit/99745023b769ec5040e8207a12bb1bb672e30e2b))

### 📚 Documentation

- Validation recipe; typed events, parsed overlay, non-HTTP failures, typed env ([f778f03](https://github.com/karmaniverous/smoz/commit/f778f03b8f1680f4897efeebebdd6d6304e238f1))
- Fix validation recipe (400 for responses, canonical header names, every token); scaffold writes eventType ([0ed977b](https://github.com/karmaniverous/smoz/commit/0ed977b1e9ba72274706a1eeceea7e5f7141289c))
- *(examples)* Walkthroughs match the CLI; add rest-step ([68b99b0](https://github.com/karmaniverous/smoz/commit/68b99b01f9c287a0a7c542341a4654c35cc8a20c))

### 🧪 Testing

- *(baseline)* List the init smoz dependency as a departure (main CI red since v0.5.0) ([18a212c](https://github.com/karmaniverous/smoz/commit/18a212c0c07814eb3865a43702d6eebc3e3dd9d5))
- *(template)* Fail the typecheck when an endpoint event widens or collapses to never ([da5435e](https://github.com/karmaniverous/smoz/commit/da5435e0e8787ac6b6c1400b0239805e156b46b8))
- *(core)* Split defineFunction tests under the 300-line limit ([0a95cc4](https://github.com/karmaniverous/smoz/commit/0a95cc467190d42bde1f406aae46f163f2c74214))
- *(http)* Split compute and multipart tests under the 300-line limit ([f95cca5](https://github.com/karmaniverous/smoz/commit/f95cca5688c52b3de8cf958c882898d485e55958))

### ⚙️ Miscellaneous Tasks

- Release v0.6.0 ([46c2055](https://github.com/karmaniverous/smoz/commit/46c20557ca9b145221d4da2d7d16e73cf6bb4907))
## [0.5.0](https://github.com/karmaniverous/smoz/compare/0.4.1...0.5.0) - 2026-11-17

### 🚀 Features

- [**breaking**] Get-dotenv 8 as an optional peer; smoz reports its own version (#33) ([c3c53cc](https://github.com/karmaniverous/smoz/commit/c3c53cc8d0e80c56b98afe9126cd8223bc5edc73))
- ./cli subpath for smozPlugin; smoz bin is a launcher with an install hint ([18063a8](https://github.com/karmaniverous/smoz/commit/18063a856d4d3396055001af015b7bf2de05576c))
- *(release)* Name GitHub releases smoz@version with git-cliff notes (#18) ([f00df40](https://github.com/karmaniverous/smoz/commit/f00df40bde01251fdffe3812e117d08e45255021))

### 🐛 Bug Fixes

- Find prettier and serverless hoisted to a workspace root ([99510b4](https://github.com/karmaniverous/smoz/commit/99510b425412ab49820220efc030e32ec2a87141))
- Resolve tool bins from package.json, nearest copy only, no NODE_PATH ([79c4e22](https://github.com/karmaniverous/smoz/commit/79c4e2241f194769e0753135b73082fd5cef0d92))
- Address S16 review findings ([8134685](https://github.com/karmaniverous/smoz/commit/8134685ac8ef555e21e37944315836c0366fc083))
- *(init)* Scaffold the selected working directory ([fe89ff2](https://github.com/karmaniverous/smoz/commit/fe89ff2eff2ef0786752993ffa1b7e9bf86ff73b))
- *(init)* Skip copied dependencies and metadata ([09007fe](https://github.com/karmaniverous/smoz/commit/09007fee1ca7237536b7212e92bf5090405e7ed5))

### 💼 Other

- Npm audit fix ([41bee97](https://github.com/karmaniverous/smoz/commit/41bee97b5a478ce655ce3fa53532ba7257f344b6))

### 📚 Documentation

- AGENTS.md for the get-dotenv 8 work, and CLAUDE.md ([5508687](https://github.com/karmaniverous/smoz/commit/5508687eda251e15804f198afd130546ad838b7e))
- Bootstrap with get-dotenv ^8; drop the nonexistent init -i (#35) ([4f65ffa](https://github.com/karmaniverous/smoz/commit/4f65ffa34c929c1f17ea8b5cfd435edd1df6ab9d))

### 🧪 Testing

- Record the smoz 0.4.1 CLI baseline (help, -V, init) ([ea1aa6f](https://github.com/karmaniverous/smoz/commit/ea1aa6f01c6df6722ad96ad071296c1c4b5d8bce))
- Cover CLI host in process ([882bb13](https://github.com/karmaniverous/smoz/commit/882bb13278f24a9f3e7f34e3dd0c544374fb0918))

### ⚙️ Miscellaneous Tasks

- Use get-dotenv 8 registry prerelease ([478e325](https://github.com/karmaniverous/smoz/commit/478e32512bb79aa25b3c54eab3103c0fc5a451e4))
- Release v0.5.0 ([968791f](https://github.com/karmaniverous/smoz/commit/968791fcac6db150825c3f2736fe7da16a09dcbe))
## [0.4.1](https://github.com/karmaniverous/smoz/compare/0.4.0...0.4.1) - 2026-11-05

### 🐛 Bug Fixes

- *(core)* Derive eventType, endpoints root and name from the caller's path inside bundles ([b66be5a](https://github.com/karmaniverous/smoz/commit/b66be5a3299e754e2a74972fe8890a729f029432))
- *(core)* Keep a UNC root when joining the functions folder ([749faf7](https://github.com/karmaniverous/smoz/commit/749faf71598dfc73aa777937c9fcacf733d047a2))

### 💼 Other

- Npm audit fix ([448509b](https://github.com/karmaniverous/smoz/commit/448509b98bdf99e390380fa85d36a9d4f40dd841))

### 📚 Documentation

- Derivation works the same bundled or not ([3085e51](https://github.com/karmaniverous/smoz/commit/3085e5168cfc631f85a5389a741f89b189ee6924))

### 🧪 Testing

- *(core)* Cold-start functions from an esbuild bundle laid out like /var/task ([bc900c7](https://github.com/karmaniverous/smoz/commit/bc900c77a43b8c48487180825195adef654faff7))

### ⚙️ Miscellaneous Tasks

- Release v0.4.1 ([b520b71](https://github.com/karmaniverous/smoz/commit/b520b71d482e28c9982e108a21d0bbd91ee0d2c7))
## [0.4.0](https://github.com/karmaniverous/smoz/compare/0.3.0...0.4.0) - 2026-11-04

### 🚀 Features

- Derive defineFunction config from path and app defaults; per-function http ([434fd5f](https://github.com/karmaniverous/smoz/commit/434fd5f583f967699e1292f50352140d1b764cbd))
- Export defineFunction option and functionDefaults types ([a85d1ce](https://github.com/karmaniverous/smoz/commit/a85d1ce45515ccef80b380a29e643e432367b0b9))
- *(cli)* Smoz add writes only real overrides; template lambdas slimmed; typecheck add output ([70db24f](https://github.com/karmaniverous/smoz/commit/70db24f1fc46b15a23c1da2cf11aac59f2050597))
- Per-function serverless config passthrough (memorySize, timeout, tenancy, image) ([0ab3e1f](https://github.com/karmaniverous/smoz/commit/0ab3e1f3a38f8d903a5d823cd1db16d1e873dc78))

### 🐛 Bug Fixes

- FunctionDefaults.http never overrides the function's own profile choice ([228f3ae](https://github.com/karmaniverous/smoz/commit/228f3ae9c5e5c003d933d0c6994b44decf34e09c))
- *(cli)* Spawn PATH binaries without args+shell (DEP0190); resolve tsx via tsx/cli ([67d89df](https://github.com/karmaniverous/smoz/commit/67d89df0926f74fc678fac9f8371a7b4ed84c3d6))
- *(template)* Middy dependencies satisfy smoz peer ranges ([c749c61](https://github.com/karmaniverous/smoz/commit/c749c61ca105d2b189bffefe4942c8dd770d1383))
- *(core)* Review fixes - explicit contentType wins, unknown profile throws, extend.after before shape, route check, path containment, image merge ([bce350b](https://github.com/karmaniverous/smoz/commit/bce350b71f96bebda171f6476071a4c805173dab))
- *(cli)* Reject % and a quoted trailing backslash on Windows; templates:typecheck cleans up before exiting ([3e5fea6](https://github.com/karmaniverous/smoz/commit/3e5fea6f73c1960c417059467ed95df55df2d863))
- *(deps)* Zod-openapi and @serverless/typescript as optional peers; template matches SMOZ engines and peers ([5a48971](https://github.com/karmaniverous/smoz/commit/5a4897193b1ad400bca7f75f99ed2f4abcb92499))
- *(cli)* Smoz dev encodes binaryMediaTypes request bodies as base64, as API Gateway does ([e35ef95](https://github.com/karmaniverous/smoz/commit/e35ef95a20b5e7a85a0270a830a7e23fde19e706))
- *(cli)* Dev decodes base64 responses; await async serverless.ts; knip and docs ([c2df21b](https://github.com/karmaniverous/smoz/commit/c2df21bb8e531bf693c842de0e3f92d4623f3f96))
- *(release)* Release:pre marks GitHub pre-releases (github.preRelease) ([039bdc6](https://github.com/karmaniverous/smoz/commit/039bdc6ec336aa7b694ba8de0a2be17b44475faa))

### 🚜 Refactor

- Address review of the dependency update ([5fb3b95](https://github.com/karmaniverous/smoz/commit/5fb3b95dc6ab366fc0ad13acb3b40043fe4375bd))

### 📚 Documentation

- Show minimal defineFunction, derived fields and functionDefaults ([bb6cdd9](https://github.com/karmaniverous/smoz/commit/bb6cdd964236d2884ac9824081b03cb68ee746a1))
- Minimal defineFunction in every example; tour shows smoz add output ([c899184](https://github.com/karmaniverous/smoz/commit/c8991847451c03f4d486921aa3c456120523fff8))
- *(contributing)* Local tests run on Vitest 5 ([21a34b5](https://github.com/karmaniverous/smoz/commit/21a34b56b3cafb33e66b007e5e168aff3e920b58))

### 🧪 Testing

- Cover add param forms and errors, phased replace, inline route skips ([8ca8e6e](https://github.com/karmaniverous/smoz/commit/8ca8e6e58e5317c529609ce4434508ea5f9f20e3))

### ⚙️ Miscellaneous Tasks

- Actions/checkout and actions/setup-node v7 (Node 24 runtime) ([5cfe861](https://github.com/karmaniverous/smoz/commit/5cfe8618652d96dc45f3cee799b437e4cfebde9a))
- *(template)* Update default template dependencies ([55718a0](https://github.com/karmaniverous/smoz/commit/55718a0a5ace29df6ed2205c84d6f54675e013f2))
- Release v0.4.0 ([6784779](https://github.com/karmaniverous/smoz/commit/6784779fbb51437dee62888eeb28041de0f0979b))
## [0.3.0](https://github.com/karmaniverous/smoz/compare/0.2.20...0.3.0) - 2026-11-03

### 🚀 Features

- *(http)* Opt-in multipart/form-data body parser ([ea43041](https://github.com/karmaniverous/smoz/commit/ea43041b7faf158e1c2084312405933d1d95c0c9))

### 🐛 Bug Fixes

- *(http)* Keep multipart parser bundle-safe; correct docs ([ba5b452](https://github.com/karmaniverous/smoz/commit/ba5b452fcf0276f0d026bf196c824c2439f9b0c8))

### 📚 Documentation

- Add AGENTS.md and sync contributor docs ([fdba512](https://github.com/karmaniverous/smoz/commit/fdba512a497885cee816685188f915f4eb9f45e3))

### 🧪 Testing

- *(http)* Cover error-expose and serializer steps ([175d5c8](https://github.com/karmaniverous/smoz/commit/175d5c825cc259393f8ca58f445bc73a2297b037))

### ⚙️ Miscellaneous Tasks

- Enforce quality gates in CI and fix failures on main ([6723f85](https://github.com/karmaniverous/smoz/commit/6723f85dc1cd0cadd04ce35fa8d89bc72c293f35))
- Address review on quality gates ([2927954](https://github.com/karmaniverous/smoz/commit/2927954719cc8e1cf2346de554e3a26919a5a8b3))
- Run on Windows too; audit fails only on high severity ([4867399](https://github.com/karmaniverous/smoz/commit/4867399b8533ce53d903c510000c4345a42c7f8d))
- Release v0.3.0 ([3931300](https://github.com/karmaniverous/smoz/commit/3931300e669617a19fddaa6ad59872ec6f54d1e1))
## [0.2.20](https://github.com/karmaniverous/smoz/compare/0.2.19...0.2.20) - 2026-08-26

### 🐛 Bug Fixes

- *(openapi)* Use local tsx binary and preserve process env ([5951219](https://github.com/karmaniverous/smoz/commit/5951219637425a30b94e3a6a8396cec4c0db2f9b))
- *(openapi)* Resolve tsx CLI for cross-platform execution ([982ce0e](https://github.com/karmaniverous/smoz/commit/982ce0e1e8a47bf588c26b5029be05c009fa5492))

### ⚙️ Miscellaneous Tasks

- Install middy packages ([449a0ac](https://github.com/karmaniverous/smoz/commit/449a0acfa1295ef9388e257fca8d978bb076e947))
- Release v0.2.20 ([078b4ff](https://github.com/karmaniverous/smoz/commit/078b4ff9d17d0b8625e411f9efdb2532062e6b5c))
## [0.2.19](https://github.com/karmaniverous/smoz/compare/0.2.18...0.2.19) - 2026-08-03

### 🐛 Bug Fixes

- Split barrel into config + http runtime to unblock SLS esbuild ([9a9d20d](https://github.com/karmaniverous/smoz/commit/9a9d20d82bd1684fc7e5cf9265ccfb19281f674b))
- Restore type-only exports, mark middy peers optional ([e14e495](https://github.com/karmaniverous/smoz/commit/e14e495a16b4ee06338e069b97773633d4a85fee))
- Resolve knip issues from exports map split ([3fc7d3c](https://github.com/karmaniverous/smoz/commit/3fc7d3c9ac26db498d4cd39dbc25b8c88f11dd50))

### ⚙️ Miscellaneous Tasks

- Release v0.2.19 ([fc88522](https://github.com/karmaniverous/smoz/commit/fc885229c14c3e2a0e1668427722ae4e314fba7a))
## [0.2.18](https://github.com/karmaniverous/smoz/compare/0.2.17...0.2.18) - 2026-07-31

### 🐛 Bug Fixes

- Flatten exports map to expose top-level default condition ([c854d1c](https://github.com/karmaniverous/smoz/commit/c854d1cb073cfc9937e738c7233c699ad24b033f))

### ⚙️ Miscellaneous Tasks

- Release v0.2.18 ([24c43bf](https://github.com/karmaniverous/smoz/commit/24c43bff260f51e323a8ebd97825b16604131484))
## [0.2.17](https://github.com/karmaniverous/smoz/compare/0.2.16...0.2.17) - 2026-07-27

### 🚀 Features

- Drop CJS output, ESM-only package ([97dadef](https://github.com/karmaniverous/smoz/commit/97dadefee890a0793d8bb45cf45d0158d332a1a5))

### ⚙️ Miscellaneous Tasks

- Release v0.2.17 ([7e51633](https://github.com/karmaniverous/smoz/commit/7e5163361bcdf26c8c76533580569f126924c99f))
## [0.2.16](https://github.com/karmaniverous/smoz/compare/0.2.15...0.2.16) - 2026-07-16

### 🐛 Bug Fixes

- Apply context prefixes and auth config in serverless builder ([40a10c1](https://github.com/karmaniverous/smoz/commit/40a10c1889b74d7a8c19b48b521e106baf173d23))

### ⚙️ Miscellaneous Tasks

- Release v0.2.16 ([8ced054](https://github.com/karmaniverous/smoz/commit/8ced0547e77b47faeead0722908b3c61ce5f631e))
## [0.2.15](https://github.com/karmaniverous/smoz/compare/0.2.14...0.2.15) - 2026-07-16

### 🐛 Bug Fixes

- Emit CLI as ESM to resolve CJS/ESM export mismatch with get-dotenv ([613e37a](https://github.com/karmaniverous/smoz/commit/613e37a4278bb5e1ce3b7c752d909947d7f8f31d))

### ⚙️ Miscellaneous Tasks

- Release v0.2.15 ([29df277](https://github.com/karmaniverous/smoz/commit/29df27764206212d1cf63069b4b67bc46a964519))
## [0.2.14](https://github.com/karmaniverous/smoz/compare/0.2.13...0.2.14) - 2026-07-16

### 💼 Other

- Ni ([c640f90](https://github.com/karmaniverous/smoz/commit/c640f90527775133935f7d3b6876a84ca7ec2c9d))

### ⚙️ Miscellaneous Tasks

- Update dependencies ([0f8fb46](https://github.com/karmaniverous/smoz/commit/0f8fb46e81ebc1d9e4c14d5c0e7e075f949a364e))
- Release v0.2.14 ([f3727f1](https://github.com/karmaniverous/smoz/commit/f3727f111441bb9c68da6a22aa6513b2b163d204))
## [0.2.13](https://github.com/karmaniverous/smoz/compare/0.2.12...0.2.13) - 2026-07-15

### 🐛 Bug Fixes

- Correct error response shaping and CORS on error path ([096469f](https://github.com/karmaniverous/smoz/commit/096469f155e5cf4871d283251d65c643aa1d9926))

### 🚜 Refactor

- Address copilot review — extract helpers, tighten guards, fix ordering ([ca96e84](https://github.com/karmaniverous/smoz/commit/ca96e8457a431dadb1d97d755dca6bd1c1184359))

### ⚙️ Miscellaneous Tasks

- Release v0.2.13 ([03a2153](https://github.com/karmaniverous/smoz/commit/03a2153b820018aa2638dfde601244d2396dd98f))
## [0.2.12](https://github.com/karmaniverous/smoz/compare/0.2.11...0.2.12) - 2026-07-14

### 🚀 Features

- Remove legacy middleware path, JSON-encode error responses (#6) ([9dd8ca6](https://github.com/karmaniverous/smoz/commit/9dd8ca60a1632c497e052473e7f7d653de070f5b))

### 🐛 Bug Fixes

- Sync package-lock.json for npm ci (#6) ([feefa22](https://github.com/karmaniverous/smoz/commit/feefa2231a78040a7aa820d6bd090f36494163a0))

### 🧪 Testing

- Add error response tests, fix double-encoding, derive test types (#6) ([1f6519f](https://github.com/karmaniverous/smoz/commit/1f6519f66e18aa9cae1d5c6394b1290d1396e9dc))

### ⚙️ Miscellaneous Tasks

- Trigger CI re-run ([0f106f5](https://github.com/karmaniverous/smoz/commit/0f106f59dd281a1fd5f371d5ba70be3cc8b4d365))
- Release v0.2.12 ([79f0b76](https://github.com/karmaniverous/smoz/commit/79f0b7616da7956fe3daddfdafe2d6d4cca113ab))
## [0.2.11](https://github.com/karmaniverous/smoz/compare/0.2.10...0.2.11) - 2026-07-14

### 🚀 Features

- Run prettier in smoz openapi command (#4) ([a308395](https://github.com/karmaniverous/smoz/commit/a308395e5365e865ade09ff2ad7a8944280fca0f))

### 🐛 Bug Fixes

- Address copilot review — require local prettier, surface spawn errors (#4) ([72ff791](https://github.com/karmaniverous/smoz/commit/72ff79117e5526e7cf2b450b5ed9c1d26d4bfc9a))

### 💼 Other

- Updated docs ([ef4bfb6](https://github.com/karmaniverous/smoz/commit/ef4bfb65f8e0f4b0139139020c6671a54a70bc8d))
- Cleanup ([41e360d](https://github.com/karmaniverous/smoz/commit/41e360db09d1dc63987fbc5c503c5e05570d5b67))
- Use package ts version ([5271454](https://github.com/karmaniverous/smoz/commit/527145407456a2026b318a59df45dd41a62af9f0))
- Use package ts version ([e69d3fe](https://github.com/karmaniverous/smoz/commit/e69d3fe4c1ed7a59807ac08f9f36e6bbbfb118b6))
- Cleanup ([11f0288](https://github.com/karmaniverous/smoz/commit/11f0288794958d1be1cce30c499a0dc0b72890f2))

### ⚙️ Miscellaneous Tasks

- Add npm publish safety net (.npmignore + gitignore *.local) ([8579ac0](https://github.com/karmaniverous/smoz/commit/8579ac0a9f2a53383471a5b1078a46cf644a11f8))
- Add npm-pack-check CI workflow ([05dc1b9](https://github.com/karmaniverous/smoz/commit/05dc1b9ae5323acbb99f7dbda0e9cab64fe2b1ff))
- Move changelog generation to after:bump hook ([8f4c736](https://github.com/karmaniverous/smoz/commit/8f4c7363c72d0cb887e0b3d2e2ec7d774fca436a))
- Add copilot review instructions ([eb5d481](https://github.com/karmaniverous/smoz/commit/eb5d481582decab24e23e6b2a011dc129be7f50f))
- Remove register from package script (#4) ([25d9121](https://github.com/karmaniverous/smoz/commit/25d9121cad7860756badae1ccbcb2c5f81c9be72))
- Release v0.2.11 ([4d3d219](https://github.com/karmaniverous/smoz/commit/4d3d21938e5ef157f5010db36a1d79032f6773e6))

## [0.2.10](https://github.com/karmaniverous/smoz/compare/0.2.9...0.2.10) - 2025-09-15

### 🐛 Bug Fixes

- App.create overload order for provided eventTypeMapSchema ([4e8a014](https://github.com/karmaniverous/smoz/commit/4e8a014dcbacca800e5bc42b3e64ac513c533a95))
- Place App.create implementation after overload signatures ([0bfa04a](https://github.com/karmaniverous/smoz/commit/0bfa04a3994620cf6be55c0356a8bdbf8d4ac26f))

### 💼 Other

- Updated dependencies ([5d8b3a7](https://github.com/karmaniverous/smoz/commit/5d8b3a7ce3e012917696b8b885acbfe26e41cbc9))
- Add Step Functions event (Payload wrapper) to base map

When: 2025-09-15T12:20:00Z
Why: Lambdas invoked via Step Functions “Lambda Invoke” receive an event
     object that wraps the original input under a Payload key. Exposing
     this in the base event map improves correctness and DX.

What changed:
- src/core/baseEventTypeMapSchema.ts: Added 'step' event schema as an
  object with optional Payload and passthrough; exported
  StepFunctionInvokeEvent type. Updated file-level docs.
- .stan/system/stan.todo.md: Recorded the change and updated timestamp.

Zod v4: replace passthrough with catchall on step event

When: 2025-09-15T12:27:00Z
Why: Zod v4 deprecates .passthrough(); use .catchall(z.unknown()) to allow
     additional keys on the Step Functions event wrapper.

What changed:
- src/core/baseEventTypeMapSchema.ts: 'step' event now uses
  .catchall(z.unknown()) instead of .passthrough(); updated comment.
- .stan/system/stan.todo.md: recorded Zod v4 compatibility update and
  timestamp. ([831c089](https://github.com/karmaniverous/smoz/commit/831c0893b3bd2c251d646243bebdb7d3c9d3318c))
- Step Functions recipe + project note on Zod v4 catchall ([fefff66](https://github.com/karmaniverous/smoz/commit/fefff66f68fcb2f5e4a970e2a1967880cd2d4535))
- Preserve typed default for event map via App.create overloads

When: 2025-09-15T12:45:00Z
Why: Keep eventTypeMapSchema optional at runtime but retain strong compile‑time
     inference when omitted. Avoids boilerplate in apps while preserving type
     safety and extensions.

What changed:
- src/core/App.ts: Added two overloads on App.create:
  • Omitted eventTypeMapSchema → default to baseEventTypeMapSchema (typed).
  • Provided eventTypeMapSchema → infer from provided schema (typed).
  Implementation unchanged; runtime default already in constructor.
- .stan/system/stan.todo.md: Recorded change and updated timestamp. ([089555a](https://github.com/karmaniverous/smoz/commit/089555aaf9d62320f377517b53f4565f06e1bf6c))

### ⚙️ Miscellaneous Tasks

- Release v0.2.10 ([b1c0dfb](https://github.com/karmaniverous/smoz/commit/b1c0dfbb7dd38e47001a2807ebfec83777dc656b))
## [0.2.9](https://github.com/karmaniverous/smoz/compare/0.2.8...0.2.9) - 2025-09-15

### 💼 Other

- Pin Node 22.19.0 across repo and templates

When: 2025-09-15T01:20:00Z
Why: Ensure runtime/types/CI parity on Node 22 LTS and prevent drift to
     incompatible Node versions in parent and downstream apps.

What changed:
- package.json: add engines (>=22.19.0 <23), Volta node=22.19.0, and
  devDependency @types/node@^22.
- .nvmrc, .node-version, .npmrc: created to enforce local/version pins and
  engine-strict for npm.
- .github/workflows/ci.yml: added CI workflow pinned to Node 22.19.0 running
  typecheck, lint, test, and build.
- templates/default/package.json: add engines and Volta pin.
- templates/default/.nvmrc, .node-version, .npmrc: created for downstream
  projects.
- templates/default/.github/workflows/ci.yml: sample CI pinned to 22.19.0.
- .stan/system/stan.todo.md: updated timestamp and recorded completion. ([cf90d9a](https://github.com/karmaniverous/smoz/commit/cf90d9a4fd6ebb139175f3a6a93983f85ce59790))
- Added CI badge ([59f2c74](https://github.com/karmaniverous/smoz/commit/59f2c740154e13e115c2a2cf23820fafea2c658c))
- Harden CI npm install to avoid alias/tarball 404s

When: 2025-09-15T03:55:00Z
Why: GitHub Actions failed with a 404 fetching a Smithy tarball due to an
     alias/tarball path mismatch. Pinning npm and enforcing registry +
     retries reduces this class of failures.

What changed:
- .github/workflows/ci.yml: Pin npm to 10.9.0, force the npmjs registry,
  and add conservative fetch retries before `npm i`.
- .stan/system/stan.todo.md: Recorded CI hardening and updated timestamp. ([ada2c2c](https://github.com/karmaniverous/smoz/commit/ada2c2c4a6caeb06c0b4085938520c28e79ba665))
- Removed CI workflow ([b4760a2](https://github.com/karmaniverous/smoz/commit/b4760a20d20d353a736f39a8bab9271c7764c57b))

### ⚙️ Miscellaneous Tasks

- Release v0.2.9 ([ce0ab78](https://github.com/karmaniverous/smoz/commit/ce0ab7836327d5ca9e56fff306afe51be358870a))
## [0.2.8](https://github.com/karmaniverous/smoz/compare/0.2.7...0.2.8) - 2025-09-15

### 💼 Other

- Fix downstream inline entry resolution; prefer dist under tsx

When: 2025-09-15T01:05:00Z
Why: Installed packages don’t include src/, causing “module not found”
     when we tried to run the TS entry. We should run the compiled inline
     server under tsx so downstream TS files can still load.
What changed:
- src/cli/dev/inline.ts: add resolveInlineEntry; prefer dist/mjs/cli/
  inline-server.js if present; otherwise use src TS entry; still spawn
  via tsx.
- src/cli/dev.inline.entry.test.ts: new unit tests for entry selection.
- .stan/system/stan.todo.md: record the change. ([be66721](https://github.com/karmaniverous/smoz/commit/be667214989117a3223f4b51262ed9bec5a95272))

### ⚙️ Miscellaneous Tasks

- Release v0.2.8 ([fad0163](https://github.com/karmaniverous/smoz/commit/fad0163901842201506d69f3973ad2ce1a9235d7))
## [0.2.7](https://github.com/karmaniverous/smoz/compare/0.2.6...0.2.7) - 2025-09-15

### 🐛 Bug Fixes

- *(dev)* Robust inline discovery + offline resolved URL display ([41750d4](https://github.com/karmaniverous/smoz/commit/41750d4ef62779478ae471ed885b9416be2536ad))
- *(dev)* ESM-safe inline cwd + offline URL lint guard ([a5dfed6](https://github.com/karmaniverous/smoz/commit/a5dfed6444c675475b11c21df85d60d5e34138c1))

### 💼 Other

- Make tsx mandatory for inline dev; add tests and remove fallback

When: 2025-09-15T00:00:00Z
Why: Compiled inline cannot import downstream TS apps. Inline should run
     via tsx or fail fast. The prior compiled fallback masked real issues.
What changed:
- src/cli/dev.ts: always spawn tsx for inline; remove compiled fallback
  and offline fallback; export resolveTsxCommand helper.
- src/cli/dev.inline.test.ts: unit tests for tsx resolution (present vs
  missing).
- .stan/system/stan.todo.md: record completed items and update timestamp. ([ae307a6](https://github.com/karmaniverous/smoz/commit/ae307a6c3313407123f13ff0aacb278880d85445))
- Fix Windows test flake; normalize tsx path and use fs-extra

When: 2025-09-15T00:25:00Z
Why: The inline dev helper returned a Windows-style path for the local
     tsx CLI, causing a test to fail due to separator differences. Also
     aligned fs usage with repo standard (fs-extra).
What changed:
- src/cli/dev.ts: use fs-extra instead of node:fs; normalize the local
  tsx CLI path to POSIX separators in resolveTsxCommand.
- .stan/system/stan.todo.md: record the change in Completed (recent). ([eeb762d](https://github.com/karmaniverous/smoz/commit/eeb762d8565e02470d5985a82bf1594c5200c5bd))
- Decompose dev loop into module; fix test and use node:fs

When: 2025-09-15T00:40:00Z
Why: The original dev.ts was too long. Splitting into focused modules
     improves maintainability and clarifies inline/tsx concerns. Tests
     should target the new module explicitly.
What changed:
- Added src/cli/dev/index.ts (runDev), env.ts (seed/infer), inline.ts
  (resolveTsxCommand, launchInline; node:fs).
- Updated CLI entry to import from ./dev/index.
- Updated dev.inline.test.ts to import new module; no fs-extra needed.
- Updated dev plan with decomposition notes and test path changes.

Note: Delete src/cli/dev.ts manually to complete the refactor. ([2f87523](https://github.com/karmaniverous/smoz/commit/2f875234277842062f635c26764312b06a71b42e))

### ⚙️ Miscellaneous Tasks

- Release v0.2.7 ([3480c5f](https://github.com/karmaniverous/smoz/commit/3480c5f55d05c498e75aba6a3d8f575b22560126))
## [0.2.6](https://github.com/karmaniverous/smoz/compare/0.2.5...0.2.6) - 2025-09-14

### 🐛 Bug Fixes

- *(dev)* Resolve inline entry without __dirname; type/lint cleanup; dev -V ([dcce6c9](https://github.com/karmaniverous/smoz/commit/dcce6c981e4c5db4778bfbaf585dd20aedd2cf9c))
- *(inline)* Populate routes by generating relative register imports ([f67a836](https://github.com/karmaniverous/smoz/commit/f67a8367e0cfabd9d6daed81ec2944b542bb6fdd))
- *(inline)* Use explicit .ts extensions in generated register imports ([02c9032](https://github.com/karmaniverous/smoz/commit/02c9032fb2ff1cc454a6ba1802c627cfab18bf70))
- *(inline)* Resolve tsconfig paths in tsx and keep TS-friendly register imports ([b6323ea](https://github.com/karmaniverous/smoz/commit/b6323ea5c3897ac781eda16652c072ba4677b311))
- *(dev:inline)* Drop --tsconfig-paths flag; rely on env to fix Windows ([025e2fa](https://github.com/karmaniverous/smoz/commit/025e2fab4c614f1e044972f806a549a58302fecc))
- *(inline)* Share App instance with registers to populate routes ([9589c81](https://github.com/karmaniverous/smoz/commit/9589c81fed190ba866b18d882ec7c4d34f586442))
- *(inline)* Restore Route typing, add diagnostics; show empty routes ([042588c](https://github.com/karmaniverous/smoz/commit/042588cd01fcf6453ef969a60ebe25a6ab86d36b))

### 💼 Other

- Comments ([03ee487](https://github.com/karmaniverous/smoz/commit/03ee4873da1d442eafb7d93a19bba3bc96c2137d))
- Run packaged inline via tsx; warn/fallback when unavailable ([1269f64](https://github.com/karmaniverous/smoz/commit/1269f64b16bc68c7400cd5ed5681554aeb27a9b6))

### 🚜 Refactor

- Split inline server into module folder and remove monolith ([4cdf4eb](https://github.com/karmaniverous/smoz/commit/4cdf4eb2ace03d862f3bcf4ac89a294bc390df47))

### ⚙️ Miscellaneous Tasks

- Release v0.2.6 ([0b83955](https://github.com/karmaniverous/smoz/commit/0b8395527ba60444e8d9c923dfd11e20c108fe4b))
## [0.2.5](https://github.com/karmaniverous/smoz/compare/0.2.4...0.2.5) - 2025-09-14

### 💼 Other

- Cleanup ([5fa12fa](https://github.com/karmaniverous/smoz/commit/5fa12faf34bc54af139be94f2b70fdb2e261c47f))
- Align reference/template and fix downstream drift ([1203264](https://github.com/karmaniverous/smoz/commit/120326473ace7c20d959f6e2fc3b3f4d71399bcd))
- Added change log to stan excludes ([aaab988](https://github.com/karmaniverous/smoz/commit/aaab988c2d98a0c5feea1f272b3faf3762f5516e))

### ⚙️ Miscellaneous Tasks

- Release v0.2.5 ([fdf7781](https://github.com/karmaniverous/smoz/commit/fdf7781e400403f2d71b6960228bdc450d238636))
## [0.2.4](https://github.com/karmaniverous/smoz/compare/0.2.3...0.2.4) - 2025-09-14

### 🐛 Bug Fixes

- Fix typedoc entry point ([acb5b9e](https://github.com/karmaniverous/smoz/commit/acb5b9efaaf7beb47e4bd061a2812c555da660cd))

### 💼 Other

- Drop redundant as const in envKeys ([c35c166](https://github.com/karmaniverous/smoz/commit/c35c166de52b1ab80dd3e5713093eb0e9aaf19c4))
- Bugfix ([958d73f](https://github.com/karmaniverous/smoz/commit/958d73ff3edb8992631a7584bf9a5885937deb42))
- Wire esbuild and doc params in template ([2319e8e](https://github.com/karmaniverous/smoz/commit/2319e8efa2ce777b6e32233a383f14c0d255ad2b))
- Fix ambient types path in comments (default, not minimal) ([fff5399](https://github.com/karmaniverous/smoz/commit/fff5399e9b44501f2fe5ff4b0b32f1bf97a4d89e))
- Resolve "@/..." alias in dist; fix downstream import errors ([8daaba3](https://github.com/karmaniverous/smoz/commit/8daaba3c820efae133600e2b49b92ac783e8772f))

### ⚙️ Miscellaneous Tasks

- Adopt LF line endings repo-wide and in template ([790737d](https://github.com/karmaniverous/smoz/commit/790737dc844ae249e291036cb56c44e3a77f29ea))
- Release v0.2.4 ([9238b5f](https://github.com/karmaniverous/smoz/commit/9238b5ff9d7fbb2dd62f94344b9770b7e28104b4))
## [0.2.3](https://github.com/karmaniverous/smoz/compare/0.2.2...0.2.3) - 2025-09-13

### 💼 Other

- Skip copying template package.json (merge only) ([a5e344a](https://github.com/karmaniverous/smoz/commit/a5e344ad3be2ba6eabeb28196bedc0fbec92edea))

### 📚 Documentation

- *(project)* Sync requirements with current state ([de946df](https://github.com/karmaniverous/smoz/commit/de946dfc5cf5d797f458c899176fce6d9cc49240))

### ⚙️ Miscellaneous Tasks

- Release v0.2.3 ([430ad5b](https://github.com/karmaniverous/smoz/commit/430ad5befdaf19fbb82f9d075723ae27f8d83f72))
## [0.2.2](https://github.com/karmaniverous/smoz/compare/0.2.1...0.2.2) - 2025-09-13

### 💼 Other

- *(dev)* Editor types without shipping config hacks ([31b2ef7](https://github.com/karmaniverous/smoz/commit/31b2ef7a1bd99f6ae1030210b5f2b30b2f86bc7b))
- *(types)* Fix template resolution of @karmaniverous/smoz ([b350bd8](https://github.com/karmaniverous/smoz/commit/b350bd8113b298a70478ed7805c10cb847ed80e7))
- *(types)* Fix template type resolution (ambient + paths) ([0ad86e1](https://github.com/karmaniverous/smoz/commit/0ad86e1f12f2e36fac50bb310bbe1137051acb25))
- Two-tsconfig template: dev mapping + downstream rename; simplify runner

When: 2025-09-13T17:20:00Z
Why: Make template type resolution deterministic in-repo (tsc/ESLint)
without leaking repo-local paths to downstream apps. Remove brittle temp
tsconfig injection and ambient shim.

What changed:
- templates/default/tsconfig.json: dev-only paths for
  @karmaniverous/smoz; add typeRoots.
- templates/default/tsconfig.downstream.json: new downstream tsconfig
  shipped to apps (renamed to tsconfig.json by init).
- scripts/templates-typecheck.ts: remove temp tsconfig injection; rely on
  dev tsconfig; keep build-first in package.json.
- package.json: prepend build to templates:typecheck.
- src/cli/init/runInit.ts: skip copying template tsconfig.json; rename
  tsconfig.downstream.json → tsconfig.json (with .example fallback).
- templates/default/types/smoz.dev.d.ts: removed.
- templates/default/tsconfig.__smoz.tmp.json: removed.
- .stan/system/stan.todo.md: record change set. ([19f0ebb](https://github.com/karmaniverous/smoz/commit/19f0ebb8447b0953ff407349ac53717e131dccf2))
- Fix ESLint typed resolution via extend-only tsconfig.eslint.json ([e268000](https://github.com/karmaniverous/smoz/commit/e2680007764e3c868cdbf46989fa94ab18dddd2f))
- Lint: lint config with template config ([4a50b70](https://github.com/karmaniverous/smoz/commit/4a50b70c6905351f4686bcd8b7a131b360eda419))

### 📚 Documentation

- *(contributing)* Switch to ‘npm run build’ (not ‘stan:build’) ([b889e6c](https://github.com/karmaniverous/smoz/commit/b889e6c8151e4b71a046f4733070eecd96ede38d))

### ⚙️ Miscellaneous Tasks

- Release v0.2.2 ([bf92901](https://github.com/karmaniverous/smoz/commit/bf9290164449e54bf228b625b4853a64152444c6))
## [0.2.1](https://github.com/karmaniverous/smoz/compare/0.2.0...0.2.1) - 2025-09-13

### 🐛 Bug Fixes

- *(steps)* Restore APIGatewayProxyEvent import ([30b2044](https://github.com/karmaniverous/smoz/commit/30b2044874a530961f2c200eea8c5997eff69118))

### 💼 Other

- Ensure app depends on @karmaniverous/smoz; update plan ([0b5919f](https://github.com/karmaniverous/smoz/commit/0b5919f7cf919c573d1d28eb7c3a7c2d2a386a97))
- Removed activecampaign tooling ([dbe4b03](https://github.com/karmaniverous/smoz/commit/dbe4b035b3782d4f0a442f289c9699cbc7e46446))
- Updated dependencies ([628dc07](https://github.com/karmaniverous/smoz/commit/628dc0730691e53aa64ee72460e2f57a65967021))
- Updated docs ([2acf5a4](https://github.com/karmaniverous/smoz/commit/2acf5a4a541dd03dfce35f5aa7ba98507e5fa4fd))
- Updated docs ([0ad24a4](https://github.com/karmaniverous/smoz/commit/0ad24a453ac8a6d93a131ca1d7e9a3ad96083206))

### 🚜 Refactor

- *(cli+http)* Split long modules; preserve paths ([a391c7c](https://github.com/karmaniverous/smoz/commit/a391c7c623bd50104050f91d23942d877f10a981))

### 📚 Documentation

- Lead with from‑zero quickstart; add offline & “add” examples ([bb72241](https://github.com/karmaniverous/smoz/commit/bb722415024e7259774e584281791ce4edabe103))
- Update “add” examples; record AC removal in plan ([a46307b](https://github.com/karmaniverous/smoz/commit/a46307b9bc59a8a59be6d308e5fb4967f4167036))
- Fix Tour init; README quick links & casing ([2161787](https://github.com/karmaniverous/smoz/commit/2161787515aad13fc86691f03f082800982caebd))
- *(build)* Remove TypeDoc warning (use public ApiMiddleware) ([ff698b9](https://github.com/karmaniverous/smoz/commit/ff698b9e5fd61da63405498c0265efc16f736494))
- *(why)* Finish page; fix serializer regex and lint ([7022fbf](https://github.com/karmaniverous/smoz/commit/7022fbfa3cf26b095f5b495a336fd2fdb07a0ad9))

### 🧪 Testing

- *(cli/init)* Add unit tests for init helpers ([639f958](https://github.com/karmaniverous/smoz/commit/639f9582a1aae3fb70a67589fc2a237ffd013a93))
- *(cli/init)* Stabilize helper tests (dirs, lockfile precedence) ([f6395e3](https://github.com/karmaniverous/smoz/commit/f6395e3bce7df83270fe1ebe3348058cc13dffb0))
- Add coverage for HTTP inference, non‑HTTP bypass, registry, and helpers ([ddeb372](https://github.com/karmaniverous/smoz/commit/ddeb3726fe033e3b01c86abc0c7c2ebbe11a18e6))
- Fix non‑HTTP handler and validator tests (type/lint/knip) ([33afb4c](https://github.com/karmaniverous/smoz/commit/33afb4c03da59c1007016b4b31e15823676d2191))

### ⚙️ Miscellaneous Tasks

- Release v0.2.1 ([cfa5afb](https://github.com/karmaniverous/smoz/commit/cfa5afb0a97c6b63ae09b3bb9eb28d7bbf7ad7a4))
## [0.2.0](https://github.com/karmaniverous/smoz/compare/0.1.8...0.2.0) - 2025-09-12

### 🐛 Bug Fixes

- *(cli/init)* Repair try/catch block and installed union; type-safe templates:typecheck mapping ([2b4ddfc](https://github.com/karmaniverous/smoz/commit/2b4ddfca6671b4b169aff39511d2791644e40d47))
- *(init)* Remove unnecessary optional chaining; clean lint ([b381f8b](https://github.com/karmaniverous/smoz/commit/b381f8bc02103b7c51915b55357d8fdede3d403f))

### 💼 Other

- Begin template refactor ([a6ccffd](https://github.com/karmaniverous/smoz/commit/a6ccffd4910e4438ac32fe84fcba5a5275cc7d21))
- Make templates:lint type-aware via tsconfig.eslint.json ([cda5b13](https://github.com/karmaniverous/smoz/commit/cda5b133c8b889563bef55652ebe5dc6390c95ea))
- *(init/dev)* Config defaults, flags polish, and docs ([acda1bd](https://github.com/karmaniverous/smoz/commit/acda1bd6ab8b05a3140b70e0fe2bad8e8d47cf88))
- Fix exactOptionalPropertyTypes and lint in index.ts ([98e5acd](https://github.com/karmaniverous/smoz/commit/98e5acd8b900af93ae6494ac4fa97d395bb54ca0))

### 📚 Documentation

- *(plan)* Prune completed list and refresh Next up ([e6bc46f](https://github.com/karmaniverous/smoz/commit/e6bc46fe9e4acd9dbd819f62901b08bbad70dad7))

### ⚙️ Miscellaneous Tasks

- *(init+templates)* Default template path, drop --init, fix lint/typecheck ([e03edbc](https://github.com/karmaniverous/smoz/commit/e03edbcc0cfe83d57c22cf224c6cc470b9bd7adf))
- Release v0.2.0 ([b8a8298](https://github.com/karmaniverous/smoz/commit/b8a829858ae2a885caecf6f6bd27f38544b24173))
## [0.1.8](https://github.com/karmaniverous/smoz/compare/0.1.7...0.1.8) - 2025-09-12

### 💼 Other

- Add jiti; enable tests; add VS Code + TSDoc ([ddec453](https://github.com/karmaniverous/smoz/commit/ddec453b1ffcd960fef1a3dd425050c99785179c))

### ⚙️ Miscellaneous Tasks

- Release v0.1.8 ([9de83f1](https://github.com/karmaniverous/smoz/commit/9de83f11103c73dff8a29e57100abbe68c53e23f))
## [0.1.7](https://github.com/karmaniverous/smoz/compare/0.1.6...0.1.7) - 2025-09-12

### 💼 Other

- Deliver .gitignore via template ‘gitignore’ and convert on init ([b9bf3bc](https://github.com/karmaniverous/smoz/commit/b9bf3bc6eb6b3f5e5b228ddb576fe7a16c182809))

### 📚 Documentation

- Condense requirements; prune dev plan; unwrap prose ([5fdd6cd](https://github.com/karmaniverous/smoz/commit/5fdd6cd47f8d40dc974e3950093e7d175005c2bb))
- Unwrap prose in READMEs and docs pages ([646ee25](https://github.com/karmaniverous/smoz/commit/646ee25fce421a3ddb6625ede9f7d6cc8a4360ba))

### ⚙️ Miscellaneous Tasks

- Release v0.1.7 ([626ea24](https://github.com/karmaniverous/smoz/commit/626ea2492babf2f1d4b23a428bfb2abb7fb16785))
## [0.1.6](https://github.com/karmaniverous/smoz/compare/0.1.5...0.1.6) - 2025-09-12

### 💼 Other

- *(project)* Add default .gitignore to project template ([3cec9f2](https://github.com/karmaniverous/smoz/commit/3cec9f21063ffc69cc6f0ccdacf83c3dbe4fb4c9))

### ⚙️ Miscellaneous Tasks

- Release v0.1.6 ([9c4a098](https://github.com/karmaniverous/smoz/commit/9c4a09874b7cda6546b5ebfd04c187e343e33ee4))
## [0.1.5](https://github.com/karmaniverous/smoz/compare/0.1.4...0.1.5) - 2025-09-12

### 🚀 Features

- *(templates+cli)* Add full template, publish /openapi in minimal, and fix init template resolution ([49062e7](https://github.com/karmaniverous/smoz/commit/49062e7675eeee7fa391ebb35d5d96888ffce21d))

### 🐛 Bug Fixes

- *(init+templates)* Resolve templates from package with typed options and clean template lint (unknown/await) ([9229b8c](https://github.com/karmaniverous/smoz/commit/9229b8cd0d274e3c533808cbc9042442b37da2d5))

### 💼 Other

- Use canonical app/generated/openapi.json; remove local stub ([8b5319a](https://github.com/karmaniverous/smoz/commit/8b5319a04be8fdad095cebbf53eceea733cc650a))
- Add openapi placeholders and fix handler return types ([2c236b1](https://github.com/karmaniverous/smoz/commit/2c236b1532902347ddacb555ee2d5a9102dc9d8d))

### ⚙️ Miscellaneous Tasks

- *(templates/minimal)* Serve stub JSON in /openapi handler out of the box ([277f633](https://github.com/karmaniverous/smoz/commit/277f633acb045a707a5c8375544e2624530dcf80))
- Release v0.1.5 ([e02192b](https://github.com/karmaniverous/smoz/commit/e02192b6f6158557c90d3f05033f4afc1b25fc5c))
## [0.1.4](https://github.com/karmaniverous/smoz/compare/0.1.3...0.1.4) - 2025-09-12

### 🐛 Bug Fixes

- *(cli)* Remove duplicate shebang in built CJS ([83486c6](https://github.com/karmaniverous/smoz/commit/83486c6b5090e855b4dea70085184f5995c13001))

### ⚙️ Miscellaneous Tasks

- Release v0.1.4 ([e089f61](https://github.com/karmaniverous/smoz/commit/e089f619c18d43f539c1f59898930206abe940c9))
## [0.1.3](https://github.com/karmaniverous/smoz/compare/0.1.2...0.1.3) - 2025-09-12

### 💼 Other

- Unify library and CLI builds under one Rollup config

When: 2025-09-11T00:35:00Z

Why: Ensure the published package always includes the CLI bin and reduce
build duplication. Running `npm run build` should emit library (ESM/CJS),
bundled DTS, and the CLI (CJS with shebang) in one pass.

What changed:
- rollup.config.ts: add buildCli() and include it in default export so
  dist/cli/index.cjs is produced with the library and types.
- package.json: remove redundant "build:cli" script; unified build now
  covers the CLI.
- .stan/system/stan.todo.md: record completion and update timestamp. ([ec19628](https://github.com/karmaniverous/smoz/commit/ec1962832ae580361d9c09323475c50577ed8496))
- Clean CLI build banner by externalizing Prettier

When: 2025-09-11T00:46:00Z

Why: Rollup warns about an unresolved 'prettier' dynamic import in the
CLI. The CLI already treats Prettier as optional; marking it external
keeps build output clean without changing behavior.

What changed:
- rollup.config.ts: mark 'prettier' as external in common external
  predicate so CLI bundle doesn’t warn.
- .stan/system/stan.todo.md: record the change and update timestamp. ([398b557](https://github.com/karmaniverous/smoz/commit/398b55737e07a1e46d77eb843ce864b5c317d013))
- Remove obsolete standalone CLI rollup config

When: 2025-09-11T00:50:00Z

Why: The CLI is now built by the unified rollup.config.ts alongside the
library and types. Keeping cli.rollup.config.ts risks confusion and drift.

What changed:
- Deleted cli.rollup.config.ts (superseded by unified build).
- Updated .stan/system/stan.todo.md to record the cleanup and timestamp. ([e48e517](https://github.com/karmaniverous/smoz/commit/e48e5176239f75bfc4c438b603c0c87ece84b816))

### ⚙️ Miscellaneous Tasks

- Release v0.1.3 ([1b29e3a](https://github.com/karmaniverous/smoz/commit/1b29e3a464f33955195fdd294eeeaa8ee447efd6))
## [0.1.2](https://github.com/karmaniverous/smoz/compare/0.1.1...0.1.2) - 2025-09-11

### 🐛 Bug Fixes

- *(lint)* Replace tseslint.config with defineConfig ([1a2a34f](https://github.com/karmaniverous/smoz/commit/1a2a34fbdf9cf563f0b1f098e407def910e9b882))
- *(eslint)* Export flat configs as arrays (no defineConfig) ([17d4921](https://github.com/karmaniverous/smoz/commit/17d49219d76a75d7a1dbded29504900c38d4783e))

### 💼 Other

- Added template ([bf6c96b](https://github.com/karmaniverous/smoz/commit/bf6c96b67cfd3f78801c0038553d2c364cb26f25))
- Updated package name ([3603179](https://github.com/karmaniverous/smoz/commit/3603179a30e57d44232d2bad69f022a567809683))
- Regressed dotenvx ([1ce657d](https://github.com/karmaniverous/smoz/commit/1ce657d53a09d57b4aa7e68706e4e37b6765ec06))
- Updated dependencies ([24669a0](https://github.com/karmaniverous/smoz/commit/24669a0f164d71e9a276de5f5287c3fd5730e1ee))

### ⚙️ Miscellaneous Tasks

- Release v0.1.2 ([2cbf5f2](https://github.com/karmaniverous/smoz/commit/2cbf5f22163593b14847b5b2b6279092aa6f892d))
## [0.1.1](https://github.com/karmaniverous/smoz/compare/0.1.0...0.1.1) - 2025-09-10

### 💼 Other

- Updated changelog settings ([199fb8a](https://github.com/karmaniverous/smoz/commit/199fb8a4ff4afb508b2952fa54f6b6c57e152a41))

### ⚙️ Miscellaneous Tasks

- Release v0.1.1 ([599c9df](https://github.com/karmaniverous/smoz/commit/599c9df30ba89681e0aaef64e4784dc68e19b55d))
## [0.1.0](https://github.com/karmaniverous/smoz/tree/0.1.0) - 2025-09-10

### 🚀 Features

- Add toolkit index, fix openapi script, update tests ([94dd08b](https://github.com/karmaniverous/smoz/commit/94dd08b7366316942eb4e67b106f8650e8cc2f43))
- *(app)* Introduce schema-first App class, widenable HTTP tokens, and registry aggregation ([e3a96c8](https://github.com/karmaniverous/smoz/commit/e3a96c823c1ce98363aeee67bb90299f6ec40c3b))
- *(app)* Parse serverless internally; allow stage overrides of globals ([24eab96](https://github.com/karmaniverous/smoz/commit/24eab96b6fbd2e4131d071443a84a32a604b022d))
- *(app)* FunctionName defaults from app root; drop slug; path-based defaults ([d8d0c55](https://github.com/karmaniverous/smoz/commit/d8d0c55f5e86ee7d951ca42b91029e1a6d1fdb71))
- *(middleware)* Plug wrapSerializer back into HTTP stack ([1464010](https://github.com/karmaniverous/smoz/commit/1464010f32f68706769ee077d85467f619d4b79a))
- HTTP middleware customization (defaults, profiles, transforms) ([f1a52f7](https://github.com/karmaniverous/smoz/commit/f1a52f719d6a883ff3d7d692933c0dfa0f7d1b73))
- *(customization)* Expose buildSafeDefaults; add tests; update plan ([1b2b817](https://github.com/karmaniverous/smoz/commit/1b2b817a2470d39e4b4a6634142f5c694c7b2e36))
- *(cli)* Add minimal SMOZ CLI (version/signature) ([9c6277b](https://github.com/karmaniverous/smoz/commit/9c6277b8269ceb2f5a83a6df12fbae85752f23ff))
- *(cli)* Add `smoz register` to generate register files ([03f63c1](https://github.com/karmaniverous/smoz/commit/03f63c1865284329f612428775bd70e71128e85b))
- *(cli)* Add `smoz add` scaffolder for functions ([3888c96](https://github.com/karmaniverous/smoz/commit/3888c96257ed6214f8d4769c53f2ce0e9f917187))
- *(cli)* Add `smoz init` and package minimal templates ([18c62b0](https://github.com/karmaniverous/smoz/commit/18c62b054cd8bab0d804375e7bffe22f455aed5b))
- *(templates)* Wire minimal template to register-based loaders; update plan ([7dfe71f](https://github.com/karmaniverous/smoz/commit/7dfe71fcd3b2cfece5ef68e85b92407af329d95f))
- *(init)* Additive manifest merge, install flag; add template overlays ([2d01aa1](https://github.com/karmaniverous/smoz/commit/2d01aa1b040d11606039327f0750e29fd169ceba))
- Path helper, watch mode, script chaining, fn defaults ([91da451](https://github.com/karmaniverous/smoz/commit/91da45144ecb5a3fe5c5d08a3d93a730ef91dd1c))
- Serverless register plugin; rebrand /app fixture; plan update ([f239b55](https://github.com/karmaniverous/smoz/commit/f239b55dab006f040067d8f112f261be93fb0341))
- *(cli)* Add dev/openapi; remove register --watch; local inline/offline ([8b426a4](https://github.com/karmaniverous/smoz/commit/8b426a4e01024ea8e3951f1cf987b5761b414ecc))

### 🐛 Bug Fixes

- Fixed tests ([99e928b](https://github.com/karmaniverous/smoz/commit/99e928b69c6bece51fc0e2c74afc07c43f3a7dbe))
- Repair OpenAPI builder, export serverless builder, DI callsites ([8410c94](https://github.com/karmaniverous/smoz/commit/8410c94442c498b58362ab9e05e341d626fb1a4b))
- Break last toolkit→stack cycle; inject buildFnEnv ([bb8f28b](https://github.com/karmaniverous/smoz/commit/bb8f28bc073f586062661eebab3bfba1d45104d1))
- Builder DI polish, repoRoot bug, and import sorting ([516297c](https://github.com/karmaniverous/smoz/commit/516297c1e5e7ed04c976db8c48ec89743d9d8b6f))
- Type variance, vitest cache excludes, and stan rollup tsconfig ([0570ef4](https://github.com/karmaniverous/smoz/commit/0570ef4a1771ae11d1e349c0b043795004924559))
- Vitest excludes, rollup tsconfig typing, and buildFnEnv variance ([b531f6e](https://github.com/karmaniverous/smoz/commit/b531f6e2d70a284589aec0295ded3aa6ab04ca8c))
- *(stan:build)* Remove outDir for plugin; quiet alias warnings ([70434cf](https://github.com/karmaniverous/smoz/commit/70434cf07dd9265e1afc6a0f79fe909cd3111753))
- Restore typecheck and stabilize rollup tsconfig ([c916b71](https://github.com/karmaniverous/smoz/commit/c916b719da9f429ea2b9e77461a50b4bb9edb84f))
- *(app)* Typing and test stability after App migration; widen HTTP tokens cleanly ([9a06e50](https://github.com/karmaniverous/smoz/commit/9a06e505aad2403dc4ab63529faa4779c9accb08))
- *(lint)* Remove unused BaseOperation import ([7b8ab94](https://github.com/karmaniverous/smoz/commit/7b8ab94eee47c6272ab61442fdd93a10e3705bd7))
- *(app)* Parse stage params to effective schema; default functionName drops 'app' ([03a6ae6](https://github.com/karmaniverous/smoz/commit/03a6ae6ee7b8731bc40f8e96e60a205dc9453473))
- *(app)* Parse stage params; default functionName ([2bbf95b](https://github.com/karmaniverous/smoz/commit/2bbf95bc979dad68db2cb28947a42b46299a13bf))
- Finalize HTTP customization split; tidy imports and aliases ([d0021a5](https://github.com/karmaniverous/smoz/commit/d0021a5cfb8c65def9a70e85d6729fc004ac1183))
- Correct FunctionHttpConfig typing in wrapHandler ([3c7edd7](https://github.com/karmaniverous/smoz/commit/3c7edd7e4f72b5b4e6a7b36c07ba4530fc6cdfb5))
- Tests, lint, and unused file cleanup ([07327f2](https://github.com/karmaniverous/smoz/commit/07327f2414d384561c5b9bafa222ff3dbf27f6db))
- Resolve import path and test generics after type cleanup ([3ac1917](https://github.com/karmaniverous/smoz/commit/3ac19170bdc92f3c9e349a78c806239913c2b429))
- Restore typecheck by using Rule.RuleModule ([0b2f689](https://github.com/karmaniverous/smoz/commit/0b2f689062883e08278fa82dcabb59bd164442e0))
- *(cli)* Pass argv to commander and add knip entry ([f794271](https://github.com/karmaniverous/smoz/commit/f794271a0635a9edf261d3b3567c10e1ab131ff7))
- *(init)* SpawnSync typing, literal return; quiet lint ([15ca388](https://github.com/karmaniverous/smoz/commit/15ca388c14e38f8cee17f6a8533c77af45d6c716))
- *(init)* Declare installed and tidy optional-chain ([54f2fa6](https://github.com/karmaniverous/smoz/commit/54f2fa681ed86769517f4df9db3b5b17c448a9f2))
- *(cli)* Satisfy no-unnecessary-condition in init ([e53f6a2](https://github.com/karmaniverous/smoz/commit/e53f6a286c1c6ea97844db3d98e6ed628cdb54ab))
- *(cli)* Normalize install option to satisfy lint ([6a84aba](https://github.com/karmaniverous/smoz/commit/6a84aba73a4ccc3705165157d7c54a555bb407b0))
- *(cli)* Remove unnecessary-condition in install logic ([d73bdaa](https://github.com/karmaniverous/smoz/commit/d73bdaafc96c547b0c19f613790d544f8fb67fda))
- *(dev)* Clean CLI/watch, optional defaults, and scripts ([251fe37](https://github.com/karmaniverous/smoz/commit/251fe375bce9dde70f403c0159d0b0803cd0621c))
- *(tests)* Close braces, complete serverless test, and make OpenAPI test cross‑platform ([44190c2](https://github.com/karmaniverous/smoz/commit/44190c2a201fa39f9e5392c157728192883c9e52))
- *(templates)* Pass minimal lint/typecheck; use d.ts bundle for types ([5ac5406](https://github.com/karmaniverous/smoz/commit/5ac54069f1ff9f34aacdd6ec7cd126e30b7727e3))
- *(templates)* Strict lint fixes without relaxing rules ([c7cfa96](https://github.com/karmaniverous/smoz/commit/c7cfa96d483d81ee9239eeff0ec5b34ee8648055))
- Templates lint config and record plan ([8fcfe73](https://github.com/karmaniverous/smoz/commit/8fcfe7337af1dd983ea7ede509a69964bd44fb56))
- *(templates)* Allow default project fallback for ESLint ([00d94b4](https://github.com/karmaniverous/smoz/commit/00d94b48e24d0d4f6393a4b8730893957c3613f0))
- *(templates)* Ensure TS project mapping on Windows shells ([2d68cb6](https://github.com/karmaniverous/smoz/commit/2d68cb63e591654d9e247dad1d1e16a398967577))
- *(templates)* Use project discovery for typed linting ([7e3896b](https://github.com/karmaniverous/smoz/commit/7e3896b77d88592a12f6f62d2145a50d9f6fb990))
- Add minimal template tsconfig and update plan ([b93a944](https://github.com/karmaniverous/smoz/commit/b93a944bedefce52b3fab749e740c37ffa9c3a62))
- *(templates/lint)* Add tsconfig for templates config and wire root ESLint ([5812b94](https://github.com/karmaniverous/smoz/commit/5812b94a25e3ca43695438bad147ff7e5c314738))
- *(templates/minimal)* Seed placeholder registers to unblock typecheck ([84d8916](https://github.com/karmaniverous/smoz/commit/84d89160627bc0377eb9cdfdf4e61c4e14b4b618))
- *(templates/minimal)* Use ambient declarations for registers (no generated files) ([2f7a75d](https://github.com/karmaniverous/smoz/commit/2f7a75d505d370e4c01a1f0c8eb5648c85a19c9b))
- *(templates)* VerbatimModuleSyntax-safe imports; add install guard policy ([32cb431](https://github.com/karmaniverous/smoz/commit/32cb43199033480f7062ec30fb3157770ed21085))
- *(templates)* Avoid bare side‑effect imports in minimal template ([f311202](https://github.com/karmaniverous/smoz/commit/f311202d0bb1760721a5c93cad6560822f701941))
- *(templates)* Make typecheck runner robust to undefined/stdout Buffer ([b77e900](https://github.com/karmaniverous/smoz/commit/b77e9009771ea5767b9b9b3ca18d24c454d9e288))
- *(templates)* Prefer local tsc; avoid npx EINVAL on Windows ([b60aa4c](https://github.com/karmaniverous/smoz/commit/b60aa4ce367bdd4bede59c7f7a24fd0b9ed62d4f))
- *(templates)* Run tsc via Node on Windows; robust fallbacks ([efb7a0e](https://github.com/karmaniverous/smoz/commit/efb7a0e802973894f29eac60d70167a73f795551))
- Templates minimal tsconfig rootDir + typeRoots ([24b103d](https://github.com/karmaniverous/smoz/commit/24b103db3c804f4efe873a1f5cc18f0fa553e3f7))
- *(plugin)* Lint-safe error text and default export; update plan ([b4d86b2](https://github.com/karmaniverous/smoz/commit/b4d86b249e1e19719fe5636809cffae88a13f497))
- *(cli/dev)* Resolve ESLint issues in dev loop ([d21f122](https://github.com/karmaniverous/smoz/commit/d21f122192102fbafdb2959257052f83d063a4e3))
- *(cli/dev)* Satisfy lint in verbose log and close() ([5b8dbe0](https://github.com/karmaniverous/smoz/commit/5b8dbe083ef3ba3dc009da14af7b8e572bff43cb))
- *(cli/dev)* Restore timer and simplify inline restart ([a55f6ff](https://github.com/karmaniverous/smoz/commit/a55f6ff69db26d5467bf6e1998331744ea31156a))
- *(cli/dev)* Drop unnecessary close guards in stop ([d838b0e](https://github.com/karmaniverous/smoz/commit/d838b0ef7f50bea5035f385ec44ba5eb43498dee))
- *(cli/dev)* Suppress false-positive on pending re-run guard ([88580da](https://github.com/karmaniverous/smoz/commit/88580daa85412fa1ffd31fc67b89e4b6e6a943a7))
- *(inline)* HEAD→GET route fallback and test env seeding ([142543c](https://github.com/karmaniverous/smoz/commit/142543cf4608216b9e8d56059051c18b18cff65f))
- *(offline)* Set TMP/TEMP/TMPDIR fallbacks to avoid “undefined\temp\…” files ([c5b0417](https://github.com/karmaniverous/smoz/commit/c5b041701a8f95c95890b2aacedd6c2f0de1820c))
- *(build)* Treat @/ and @@/ as externals; tidy dev plan ([404f7a7](https://github.com/karmaniverous/smoz/commit/404f7a7ef08cfc7c64195f427e09417878c00a2d))

### 💼 Other

- Initial commit ([be3f515](https://github.com/karmaniverous/smoz/commit/be3f51581f2b70ec63100d141025a71878e4f4cd))
- Boilerplate ([3eed518](https://github.com/karmaniverous/smoz/commit/3eed51899f4459735d448709bf657661fb4060f5))
- Gpt update ([c79db86](https://github.com/karmaniverous/smoz/commit/c79db86871df1f7f87d55c691aa107f5ba9d2daa))
- More gpt fodder ([5fedeb3](https://github.com/karmaniverous/smoz/commit/5fedeb31c4b71190f64bf237a9950da1dad38629))
- Finished the swing on openapi generation ([4bbe606](https://github.com/karmaniverous/smoz/commit/4bbe606084321cbd998a63c1349e2173d556e87f))
- Refinements ([9ba8eba](https://github.com/karmaniverous/smoz/commit/9ba8ebaa24a28ea5399fe06311964502fcf5de05))
- Added comments ([1ef2193](https://github.com/karmaniverous/smoz/commit/1ef2193c646d99d879d34c680605746459eab7e2))
- More gpt ([b35e755](https://github.com/karmaniverous/smoz/commit/b35e755a758a9ad642cadae2f1a0f2c51e2a2cea))
- Progress ([527340e](https://github.com/karmaniverous/smoz/commit/527340e1bbe1e1fb5ed6d3b25698be872dcd8f92))
- Boilerplate ([80cfd82](https://github.com/karmaniverous/smoz/commit/80cfd82b898083900279cc46364a938005750c27))
- Removed comment ([49c7904](https://github.com/karmaniverous/smoz/commit/49c7904f98bfe78a489eb64fd340a12c215be0e9))
- More tests ([11d835a](https://github.com/karmaniverous/smoz/commit/11d835ace2b32eec069b4c30ede4e0c1182a0eeb))
- Prepping for deployment ([636925c](https://github.com/karmaniverous/smoz/commit/636925c290dde5e37b5bd1af29d5caee84775d47))
- Disabled multipart ([eae917e](https://github.com/karmaniverous/smoz/commit/eae917e24f44004f87d80e479ff2a10789f66ddc))
- Removed cached files ([203f3f1](https://github.com/karmaniverous/smoz/commit/203f3f18e6ee6d5608813dedd2ad5fe7a6581ec6))
- Added zod response validation ([8df205e](https://github.com/karmaniverous/smoz/commit/8df205e368114b561f2bd2dd81f12944a7a5d5e2))
- Wip ([4079302](https://github.com/karmaniverous/smoz/commit/4079302db6bb582edf60d83ed6a5b37163864a6d))
- Added Drive sync ([cdd81fe](https://github.com/karmaniverous/smoz/commit/cdd81fec461d8f302a78b0addd9ea4ab15f24a12))
- Wip ([a3c892a](https://github.com/karmaniverous/smoz/commit/a3c892aac27aeb25fde9e97bcb75289d222d26af))
- Updated test fixture ([f6450b3](https://github.com/karmaniverous/smoz/commit/f6450b33fdd04f24aa3218d44ae508f61aa3eb90))
- Updated AllParams source ([8d819aa](https://github.com/karmaniverous/smoz/commit/8d819aa28fceb674dcf43f8ccb089d0f6cdcbe19))
- Bugfix ([4c2208c](https://github.com/karmaniverous/smoz/commit/4c2208c3958fbf67bed91ca0e08d46ad4e5ccd0a))
- Wups ([8a41161](https://github.com/karmaniverous/smoz/commit/8a411614e6edc4bd378a0f5553c2826ff9c9d1ab))
- Wip ([2b1d930](https://github.com/karmaniverous/smoz/commit/2b1d930641fb13862f5362bfa4a612c445ad0e2e))
- Wip ([a5f544e](https://github.com/karmaniverous/smoz/commit/a5f544ee8ce86d1703822f7489510a19b9411e1d))
- Wip ([2a9460e](https://github.com/karmaniverous/smoz/commit/2a9460e62eb5aa3ace3a1c0405ca8f3cc9d8bb64))
- Wip ([901596b](https://github.com/karmaniverous/smoz/commit/901596b06d13031de4b49f1cb1c048218df7156b))
- Wip ([2e38949](https://github.com/karmaniverous/smoz/commit/2e389498eaa886cd672e4f3598f1743ada133d37))
- Wip ([e1b0f03](https://github.com/karmaniverous/smoz/commit/e1b0f039e59816008e669a702d11ab5651bc2d5a))
- Wip ([1b0de3d](https://github.com/karmaniverous/smoz/commit/1b0de3d54a808ef48665c86e97d72ca379b5622e))
- Wip ([d34b683](https://github.com/karmaniverous/smoz/commit/d34b6837e545fb5baf12337792c50d8c5ce7558c))
- Wip ([5e90934](https://github.com/karmaniverous/smoz/commit/5e90934fb9509eef22e8547ba065b0365b4d7845))
- Wip ([82560ab](https://github.com/karmaniverous/smoz/commit/82560abc327db0676c594ea813eb4086b256820b))
- Wip ([4a26499](https://github.com/karmaniverous/smoz/commit/4a26499938d29db91263f015f58712d91f4fe0f4))
- Installed lefthook ([2490981](https://github.com/karmaniverous/smoz/commit/2490981ed7b411ceff1e17ff935396ce24c80c68))
- Update archive ([5133f07](https://github.com/karmaniverous/smoz/commit/5133f070faacb41320ddbf0f412d3c043f2b117c))
- Created local gpt dir ([bf13ea3](https://github.com/karmaniverous/smoz/commit/bf13ea37a83720242d029e67f605b3dc92e068e9))
- Create gpt dir ([44b2eec](https://github.com/karmaniverous/smoz/commit/44b2eecf5c5accce7b320890913b09df9e107e83))
- Improved archiving ([c35d258](https://github.com/karmaniverous/smoz/commit/c35d258821e071cd3426083e6f4df347c4851b56))
- Update ([6f092e0](https://github.com/karmaniverous/smoz/commit/6f092e015f1ac6d759d213564c0d484e9a226f91))
- Updated ignores ([4681d12](https://github.com/karmaniverous/smoz/commit/4681d12548917da30ef53d5f2b21dbd6c164d220))
- Wip ([9170c35](https://github.com/karmaniverous/smoz/commit/9170c358780a4bd3d2817436a88fd7d0a72ed599))
- Wip ([fa8a470](https://github.com/karmaniverous/smoz/commit/fa8a470be62bfa0b313773b0a05762ae2f678327))
- Lintfix ([99e9eae](https://github.com/karmaniverous/smoz/commit/99e9eae818efae971f279cee743b01b3a458f571))
- Wip ([06c2133](https://github.com/karmaniverous/smoz/commit/06c2133ebbe2041e273f1ec0858ea0e2e486b435))
- Wip ([d90e3d4](https://github.com/karmaniverous/smoz/commit/d90e3d496da3adfb0683a4ddc44c641f4d34ab6e))
- Wip ([671dd28](https://github.com/karmaniverous/smoz/commit/671dd2883f6921c5991c0b1a952056dbe5558265))
- Wip ([13fff25](https://github.com/karmaniverous/smoz/commit/13fff2521d735fa3d4dea0dd2bdf10264a0d1f1b))
- Created new test script ([0f42595](https://github.com/karmaniverous/smoz/commit/0f4259545b52ad831764f91d391526e47f56a892))
- Wip ([03eb98e](https://github.com/karmaniverous/smoz/commit/03eb98e4aa4c127fd91bacba5cc2d2c80d427244))
- Wip ([c7aa874](https://github.com/karmaniverous/smoz/commit/c7aa8743dabb3b3a066c5c7e29843afe7b435833))
- Wip ([5870db7](https://github.com/karmaniverous/smoz/commit/5870db7f7fb3d3319b0e1290b2a85f5e0bee7507))
- All tests pass ([4076464](https://github.com/karmaniverous/smoz/commit/40764641eeff3dcdb07ea97d60b21b95a320a3ce))
- Reorganized ([2807d0a](https://github.com/karmaniverous/smoz/commit/2807d0aabe66bdfef4b1084634ff63c99f295dfb))
- Reorg ([0586969](https://github.com/karmaniverous/smoz/commit/05869696119b3063b489cd4b331e728f6e18b224))
- Wip ([e6ae55f](https://github.com/karmaniverous/smoz/commit/e6ae55f5f75c77702b941fb2dca3163a1957e6ea))
- Wip ([10d2706](https://github.com/karmaniverous/smoz/commit/10d27064d6a9380bc20150e4231ceeaa1706e89b))
- Bugfix ([a18f04a](https://github.com/karmaniverous/smoz/commit/a18f04a71b25bcd915c5381dea5f6458edbaaf74))
- Wip ([64e9ed4](https://github.com/karmaniverous/smoz/commit/64e9ed4b319da403f7fd7b1659c1a6e1cc4ff94f))
- Wip ([0a329b1](https://github.com/karmaniverous/smoz/commit/0a329b18a7ee3d821c694ffe203926e8ecdb1445))
- Resolved remaining errors ([7b17ce2](https://github.com/karmaniverous/smoz/commit/7b17ce21844a37329866c317f60b209a06d30ef4))
- Added activecampaign ([8b973e6](https://github.com/karmaniverous/smoz/commit/8b973e6f76037fb98a12d7927f0ba674f4d9820e))
- Ran orval ([f34df9a](https://github.com/karmaniverous/smoz/commit/f34df9ae3cd9e044a7e5cb47340abe027b6b3788))
- Improved orval ([dfa44f1](https://github.com/karmaniverous/smoz/commit/dfa44f12a88f6c78f2cad173e263d427d32d81e2))
- Updated readme ([68bc769](https://github.com/karmaniverous/smoz/commit/68bc769bfb20c817032974b511f295b4887d0558))
- First pass at cached service ([2ce559a](https://github.com/karmaniverous/smoz/commit/2ce559afa5879b59dfcf326af827cb267fe84641))
- Wip ([3ca5e6f](https://github.com/karmaniverous/smoz/commit/3ca5e6fdf5ea9509c2e7e9c135d5f79d90cf8fa4))
- Wip ([1b0f4f5](https://github.com/karmaniverous/smoz/commit/1b0f4f5e517c905cc5504135ae7b4c935356bba6))
- Wip ([b9425ba](https://github.com/karmaniverous/smoz/commit/b9425baebf732c55b01b5eb0ae03149ff8275df0))
- Wip ([7a4beca](https://github.com/karmaniverous/smoz/commit/7a4beca25e410600457f12f6cda8bdc99548d290))
- Wip ([5addb85](https://github.com/karmaniverous/smoz/commit/5addb85aba563dc51e7810bee9f5ea033022195b))
- Wip ([e61b93e](https://github.com/karmaniverous/smoz/commit/e61b93e5147b719e902e8f373d41506dfe28776c))
- Wip ([5dfa0e6](https://github.com/karmaniverous/smoz/commit/5dfa0e645cd8f913a57479c17a8cad121b8e56ee))
- Resolved errors ([8d93754](https://github.com/karmaniverous/smoz/commit/8d937544deb145f3ddc53f36472f7452b16625fc))
- Wip ([f108dc2](https://github.com/karmaniverous/smoz/commit/f108dc2b24238b3bf555e0b9cb088c41a8ae79c2))
- Wip ([834d390](https://github.com/karmaniverous/smoz/commit/834d3904abd3a2752b8788ae8ac2d99c4549ffe0))
- Wip ([c512a30](https://github.com/karmaniverous/smoz/commit/c512a30bdc526f0acdbd04dd62b2403a651e5a12))
- Generated mocks ([ca3bff8](https://github.com/karmaniverous/smoz/commit/ca3bff8a72373a863db3470c44954440df8b4c39))
- Wip ([b86942a](https://github.com/karmaniverous/smoz/commit/b86942a0e2562469f4585bd4763bac493ea7eb49))
- Wip ([2d7b8ab](https://github.com/karmaniverous/smoz/commit/2d7b8abf1e8e471a187901c043618497e0c7fecc))
- Wip ([3fa7a1b](https://github.com/karmaniverous/smoz/commit/3fa7a1b705edb3e47cea3a52020036ab5717d48d))
- Wip ([0b8d855](https://github.com/karmaniverous/smoz/commit/0b8d855492bca3dbab076b948fb455d83dc7edf6))
- Wip ([a915591](https://github.com/karmaniverous/smoz/commit/a915591688d2c5ec4390ac071e1b35e3a4708a57))
- Wip ([a604bf7](https://github.com/karmaniverous/smoz/commit/a604bf755515a7b994a1345881b2bf1061c2a731))
- Wip ([900b220](https://github.com/karmaniverous/smoz/commit/900b220c30de410611f5bc5cd41333a68a081eaa))
- Wip ([fec98c7](https://github.com/karmaniverous/smoz/commit/fec98c70c1723c6cbec3fa675cb6de49c6e057e9))
- Wip ([e77b9bc](https://github.com/karmaniverous/smoz/commit/e77b9bc4139db74dc5b20b8479ead74befa8fef3))
- Updated path aliases ([1b4397c](https://github.com/karmaniverous/smoz/commit/1b4397c4856aee07d53c5bd7b7fa446971709c20))
- Publish openapi ([014e57f](https://github.com/karmaniverous/smoz/commit/014e57f49512d1bcd5cfd719f3da3814dcbb0fed))
- Wip ([36df8fd](https://github.com/karmaniverous/smoz/commit/36df8fd3623705c2964081faa1ad74e9e366a91f))
- Wip ([6167bf0](https://github.com/karmaniverous/smoz/commit/6167bf0f27e717acb6608d59be67dc85a37cbc15))
- Wip ([e3f92b2](https://github.com/karmaniverous/smoz/commit/e3f92b23a734113fa8d115cdaee25203d1a766ae))
- Wip ([1a31ce5](https://github.com/karmaniverous/smoz/commit/1a31ce5f1d29e5e90dd380be343fc60b47632597))
- Wip ([a7caf6a](https://github.com/karmaniverous/smoz/commit/a7caf6a0eb3ed9312a5e3453c1d55bc58fbc4561))
- Wip ([66bbab1](https://github.com/karmaniverous/smoz/commit/66bbab1d8b1b075d9263b73ab4e51a9219eebfa0))
- Wip ([df142b0](https://github.com/karmaniverous/smoz/commit/df142b00a009b53efa8d261be900b17123e2065b))
- Wip ([094b46b](https://github.com/karmaniverous/smoz/commit/094b46bb05b05fa7d7ccea709627730d345d0c8a))
- Stable ([934805c](https://github.com/karmaniverous/smoz/commit/934805cb7f9e87074871111f151ed13f6596978d))
- Wip ([316d518](https://github.com/karmaniverous/smoz/commit/316d5187c5d5bf8cd46b03e7b34e15bb652ca8c2))
- Wip ([bef2eda](https://github.com/karmaniverous/smoz/commit/bef2eda2fcd51c508db1e83b3fc3c172e026447c))
- Wip ([d5b3ef5](https://github.com/karmaniverous/smoz/commit/d5b3ef5de4b2532e0928efce11b8db0ad5757387))
- Wip ([2892652](https://github.com/karmaniverous/smoz/commit/289265225e78dfad56059d7b55ec03cd1144de15))
- Wip ([d69b447](https://github.com/karmaniverous/smoz/commit/d69b44758d018910d6d368a866ffc50d3152f2f3))
- Wip ([63046d1](https://github.com/karmaniverous/smoz/commit/63046d171b637ea20cf2231f5ba1580894e0bae0))
- Wip ([4e0c50a](https://github.com/karmaniverous/smoz/commit/4e0c50acd3c0e8b202083ee95df642602e2546bb))
- Wip ([8d4f3e8](https://github.com/karmaniverous/smoz/commit/8d4f3e8cf074ed93dc1f4b12a2fca8be8ebfaa21))
- Wip ([9ee8f99](https://github.com/karmaniverous/smoz/commit/9ee8f994aa1ecf491c604e12376753aabf4fc066))
- Wip ([fcb5e4c](https://github.com/karmaniverous/smoz/commit/fcb5e4cbd5aef259816cc19cdd2151fe94cd07dd))
- Wip ([d938258](https://github.com/karmaniverous/smoz/commit/d93825817ef1a8c526f5357595137d241831e881))
- Wip ([2bb5e4e](https://github.com/karmaniverous/smoz/commit/2bb5e4e0794cc750f8ca0b7a5d77ba2a8140859d))
- Wip ([4b81907](https://github.com/karmaniverous/smoz/commit/4b819070ae7bad4d740d9218a2a2a1a02e569c1a))
- Wip ([e22b603](https://github.com/karmaniverous/smoz/commit/e22b6030404fbae46a67940a5b45b01357860cb0))
- Wip ([93b227c](https://github.com/karmaniverous/smoz/commit/93b227c2a887c140d2b6e4e83f782aa5a1454140))
- Installed stan ([75eb561](https://github.com/karmaniverous/smoz/commit/75eb5613215e96d7e081c2d4152dad8c619e5857))
- Absracted out cached-axios ([a65e7cd](https://github.com/karmaniverous/smoz/commit/a65e7cdf6aad3c3a377b9641bf7b6d518b8a8996))
- Updated dependencies ([b8f0d00](https://github.com/karmaniverous/smoz/commit/b8f0d0073ee2e4dfb5e2fbec3ae99e531f9ce0b1))
- Updated stan config ([713296d](https://github.com/karmaniverous/smoz/commit/713296debc7847e26e8d87835ee07915fd8d29b9))
- Fix typecheck and serverless packaging; update Orval mutator path

When: 2025-08-30T00:00:00Z
Why: cached-axios moved its Orval mutator; typecheck revealed generic and
     typing issues; serverless packaging failed due to config parsing.

What changed:
- lib/types/Handler.ts: add default for EventType generic to preserve
  backward compatibility in tests.
- lib/handler/makeWrapHandler.ts: annotate middy-wrapped params.
- lib/http/resolveHttpFromFunctionConfig.ts: constrain generics to ZodType.
- lib/serverless/buildFunctionDefinitions.ts: accept serverlessConfig and
  compute handler path; fix generics and event typing.
- src/step/activecampaign/.../handler.ts: cast event to LambdaEvent.
- services/activecampaign/orval.config.ts: point to
  @karmaniverous/cached-axios/mutators/orval.
- services/activecampaign/tsconfig.json, tsconfig.build.json: remove stale
  references to non-existent packages/cached-axios.
- lib/handler/middleware/middleware.test.ts: return HttpResponse from helper.
- services/activecampaign/package.json: bump cached-axios to ^0.2.0.
- .stan/system/stan.todo.md: add/update dev plan per process. ([1a84c6c](https://github.com/karmaniverous/smoz/commit/1a84c6c3681d8405c3b68f56b1d53d02c07250a9))
- Remove Handler generic defaults; ignore generated in Knip

When: 2025-08-31T00:00:00Z
Why: Generic defaults on Handler’s EventType harm inference. Tests should
     provide the EventType explicitly. Knip was flagging a large number of
     unused files from generated code; ignore these paths to reduce noise.

What changed:
- knip.json: add "**/generated/**" to "ignore" so Knip skips Orval outputs.
- lib/handler/Handler.test.ts: supply APIGatewayProxyEvent as the 3rd type
  argument to Handler.
- .stan/system/stan.todo.md: update timestamp and record the changes. ([1f8e4bc](https://github.com/karmaniverous/smoz/commit/1f8e4bcf0b6485197f17844ef76fe3457312e2fe))
- Add generate script ([29ad19c](https://github.com/karmaniverous/smoz/commit/29ad19c6501cc5ee5c595f46e532d6fc18eeaafd))
- Fix Orval mutator, remove x-context, clean workspaces ([e826063](https://github.com/karmaniverous/smoz/commit/e826063fb46bdaed790f969cc2bae49f98c6d7ad))
- Fix makeWrapHandler parse and Orval mutator path

When: 2025-08-31T00:15:00Z
Why: TypeScript parse error blocked build/tests; Orval generation failed
     to locate the local mutator, leaving stale monorepo imports and
     breaking typecheck.

What changed:
- lib/handler/makeWrapHandler.ts: move const destructuring off the same
  line as a comment to prevent it being commented out; minor format tidy.
- services/activecampaign/orval.config.ts: set override.mutator.path to
  '../src/orval.mutator.ts' so Orval resolves the local wrapper from the
  generated workspace.
- .stan/system/stan.todo.md: update plan with fixes and next steps
  (regenerate, typecheck/lint/test, refine Knip config).

  Document cached-axios integration and Orval guidance

When: 2025-08-31T00:25:00Z
Why: Provide project-relevant guidance for @karmaniverous/cached-axios
     usage (caching IDs/tags, query/mutation wrappers, env defaults) and
     clarify Orval mutator requirements to unblock generation.

What changed:
- .stan/system/stan.project.md: add a comprehensive section covering
  cached-axios concepts, patterns used in this repo, Orval mutator
  export requirements, env keys, and lint/type guidance.
- .stan/system/stan.todo.md: add actionable item to implement an explicit
  `orvalMutator` export in the local wrapper if Orval reports it missing. ([b5090c9](https://github.com/karmaniverous/smoz/commit/b5090c948a8cba326f55395e539154b4296cab55))
- Make Orval mutator a concrete forwarder function

When: 2025-08-31T00:35:00Z
Why: Orval failed generation with “mutator file doesn't have the
     orvalMutator exported function”. A re-export alone may not satisfy
     Orval's static export check.

What changed:
- services/activecampaign/src/orval.mutator.ts: implement a named
  `orvalMutator` function that forwards to the upstream implementation,
  preserving behavior while passing Orval's export check.
- .stan/system/stan.todo.md: record the mutator fix and keep next steps
  focused on re-running generation and then typecheck/lint/test. ([f6dc4cd](https://github.com/karmaniverous/smoz/commit/f6dc4cd5bd590646a513b06603341cc85d675f78))
- Use value-type generics for env keys (no z.infer in generics)

When: 2025-08-31T01:28:00Z
Why: GlobalParams/StageParams in this repo are already inferred value types;
  factories/configs should use those types for key sets. Prior patch used
  z.infer in generic definitions, implying schema generics.

What changed:
- lib/types/FunctionConfig.ts
  * Switch GlobalParams/StageParams generics to value types
    (Record<string, unknown>). fnEnvKeys keyed by value types.
- lib/handler/makeFunctionConfig.ts
  * Update generic constraints to value types to match usage.
- lib/serverless/stagesFactory.ts
  * Rework input/output generics to value types; schemas remain inputs for
    validation; buildFnEnv key typing from value types.
- .stan/system/stan.todo.md
  * Note correction and update timestamp. ([a184da0](https://github.com/karmaniverous/smoz/commit/a184da08f0ccfcd1a956c153b1bb8236e6a96b52))
- Restore strict fnEnvKeys typing, align handler generics

When: 2025-08-31T02:28:00Z
Why: Allowing `string` in fnEnvKeys defeated compile-time protection
  against unsupported env keys. Tests also assumed ZodObject generics in
  makeWrapHandler; we standardize on value-type generics and remove
  redundant fnEnvKeys in tests.

What changed:
- lib/types/FunctionConfig.ts
  * Reverted fnEnvKeys to readonly (keyof Global | keyof Stage)[].
- lib/handler/makeWrapHandler.ts
  * Treat Global/Stage generics as value types; decouple loadEnv typing
    to ZodObject schemas.
- lib/http/resolveHttpFromFunctionConfig.ts
  * Use value-type generics; constrain EventTypeMap.
- lib/openapi/buildPathItemObject.ts
  * Use value-type generics with BaseEventTypeMap.
- lib/serverless/buildFunctionDefinitions.ts
  * Remove unused variable in map callback to satisfy lint.
- lib/handler/makeWrapHandler.test.ts
  * Drop fnEnvKeys: [] to preserve strict typing.
- src/step/activecampaign/contacts/getContact/handler.ts
  * Keep refined Payload narrowing. ([bb58a2c](https://github.com/karmaniverous/smoz/commit/bb58a2c65332fe9811d7140d0714d8111ca3c6fc))
- Make unused opts explicit and align to client arities ([c487dd0](https://github.com/karmaniverous/smoz/commit/c487dd0482980b68caa5c98ccdf6d1c4478f6a2a))
- Fix BaseEventTypeMap import, clean imports, align CFV wrappers

When: 2025-08-31T21:35:00Z
Why: Typecheck failed due to missing BaseEventTypeMap import and arity
  mismatches in custom-fields-and-values wrappers. Lint flagged unused
  Zod* imports and an unnecessary assertion.

What changed:
- lib/http/resolveHttpFromFunctionConfig.ts
  * Import BaseEventTypeMap; drop unused Zod* imports.
- lib/openapi/buildPathItemObject.ts
  * Remove unused ZodObject/ZodRawShape; tidy import ordering.
- lib/serverless/buildFunctionDefinitions.ts
  * Remove unused Zod* imports and type aliases; drop unnecessary events cast.
- services/activecampaign/src/wrapped/custom-fields-and-values.ts
  * Use `void opts;` and call generated clients with supported arities.
- .stan/system/stan.todo.md
  * Record these fixes in Completed (recent). ([62ae80c](https://github.com/karmaniverous/smoz/commit/62ae80ccfef67f3e86c09126309289ce78028db8))
- Updated stan ([1dd03b9](https://github.com/karmaniverous/smoz/commit/1dd03b9517fe7baccc8afa0b97b46527048eaa10))
- Remove unnecessary type assertions in contacts wrapper ([631b126](https://github.com/karmaniverous/smoz/commit/631b1262733e2bccb8ba2068d4c1c82c2c0d3deb))
- Lint fixes and knip config refinement

When: 2025-08-31T00:55:00Z
Why: Clean up remaining ESLint errors in tests and reduce Knip false
positives by declaring proper workspace entries and ignoring generated
and test helper files.

What changed:
- lib/handler/middleware/middleware.test.ts: typed JSON-parsed bodies
  as unknown to satisfy no-unsafe-assignment without altering behavior.
- knip.json: switched to workspace-scoped config; added root entries
  (serverless.ts, lib/openapi/generate.ts) and service entry
  (services/activecampaign/src/index.ts); ignored generated and test
  helpers.
- .stan/system/stan.todo.md: updated timestamp; marked lint/knip items
  completed; tightened Next up to rerun scripts and reassess Knip. ([705f388](https://github.com/karmaniverous/smoz/commit/705f3884430f48d3ebaabdc8cf1be1dec258d484))
- Make ESLint CLI type-aware by setting parser and projects

When: 2025-08-31T01:20:00Z
Why: The last flat-config block overwrote the parser from
strictTypeChecked, so the CLI used espree and skipped type-aware rules
like @typescript-eslint/no-unsafe-return. VS Code showed errors, but
npm run lint did not.

What changed:
- eslint.config.ts: added parser: tseslint.parser and explicit
  parserOptions.project for root and service tsconfigs so the CLI loads
  type information and enforces type-aware rules.
- .stan/system/stan.todo.md: updated timestamp and recorded the ESLint
  CLI fix in Completed (recent). ([df13643](https://github.com/karmaniverous/smoz/commit/df136437ff8b5ee5c99f75227d31d5e1dca11e4b))
- Restore rich HTTP middleware pipeline in buildHttpMiddlewareStack

When: 2025-08-31T01:45:00Z
Why: During the transition from buildHttpStack to
buildHttpMiddlewareStack the HTTP middlewares were lost. We need the
full pipeline (normalizers, content negotiation, JSON body parsing,
Zod validation, error exposure + http-error-handler, CORS, response
shaping, serializer) while keeping the current paradigm where
non-HTTP (“internal”) paths bypass Middy in makeWrapHandler.

What changed:
- lib/handler/middleware/buildHttpMiddlewareStack.ts: composed the full
  HTTP stack using existing helpers (asApiMiddleware, combine,
  httpZodValidator, shortCircuitHead) and @middy middlewares
  (header/event normalizers, content negotiation, JSON body parser,
  http-error-handler, CORS, response serializer). No internal toggle.
- .stan/system/stan.todo.md: updated timestamp; noted middleware
  restoration in Completed (recent). ([5eb7e16](https://github.com/karmaniverous/smoz/commit/5eb7e165d3037f3c7a01343971cb6dee2fab1d2c))
- HTTP stack: fix HEAD/Zod interaction, typing, and lint

When: 2025-08-31T02:00:00Z
Why: Response validation was running after HEAD short-circuit because the
base return overwrote the pre-set response, causing a 400. Typecheck
also failed due to exactOptionalPropertyTypes, and ESLint flagged
several issues.

What changed:
- lib/handler/middleware/buildHttpMiddlewareStack.ts:
  - Added mHeadFinalize (after) to set a shaped 200 {} for HEAD before
    Zod-after runs (skips response validation for HEAD only).
  - Passed Zod options via conditional spreads to satisfy
    exactOptionalPropertyTypes.
  - Removed unused type import; replaced assertion with typed variable;
    avoided String() wrapper; replaced ??= with guarded assignments.
  - Preserved the full HTTP pipeline; no internal toggle added.
- .stan/system/stan.todo.md: updated timestamp and recorded fixes. ([ceaced7](https://github.com/karmaniverous/smoz/commit/ceaced715bb3173049cfc15cd9238ac6e4a84257))
- Preserve full HTTP middleware and set toolkit direction ([a644ee6](https://github.com/karmaniverous/smoz/commit/a644ee65992ee60ada603e4162d7370dfd5414b0))
- Renamed directories ([1dacedd](https://github.com/karmaniverous/smoz/commit/1dacedd6058d027a08a94d8e236da9395512b1da))
- Reorganization ([39c2060](https://github.com/karmaniverous/smoz/commit/39c20603af705972e069ce4b07f1b9690c72a3a8))
- Installed dependencies ([c7e564c](https://github.com/karmaniverous/smoz/commit/c7e564ccc83d74b3480744c9491009ccb6b07795))
- Swapped @ and @@ aliases ([7bd7e6b](https://github.com/karmaniverous/smoz/commit/7bd7e6b3416a457557794e9bc80e59ba40251d4c))
- *(rollup)* Use tsconfig.rollup.json explicitly ([1e72d76](https://github.com/karmaniverous/smoz/commit/1e72d7634249b4bad37be997c0dd03057e3a2d66))
- Manual tsconfig edits ([288f8ca](https://github.com/karmaniverous/smoz/commit/288f8ca87468a32766e2ee51e82a32f166f2c666))
- Stack -> app ([e92c174](https://github.com/karmaniverous/smoz/commit/e92c17421cab6685344d64c2e1d0b076d1b5ce5d))
- Name refactor ([22abaa0](https://github.com/karmaniverous/smoz/commit/22abaa05315c9d44680082a9ab2c1f0dac3e043a))
- Consistent generics ([61d44a7](https://github.com/karmaniverous/smoz/commit/61d44a77038be82c9b8b064ceaeeb2175fb50500))
- Removed default type params ([8166557](https://github.com/karmaniverous/smoz/commit/816655742d5ca4b99e922fb3a7c82e6206b855f0))
- Created registry, wip ([05559dd](https://github.com/karmaniverous/smoz/commit/05559dd5f4e3d05dd4b65e079043c80e3f1a7245))
- Updated roots ([73dad34](https://github.com/karmaniverous/smoz/commit/73dad34360b3e5b432675c37ca0a426d3b5674af))
- Rebrand ([fb7e4e5](https://github.com/karmaniverous/smoz/commit/fb7e4e585c1e43c4f06d74c14a2c970cbdd1d806))
- Updated readme ([0dd2cdf](https://github.com/karmaniverous/smoz/commit/0dd2cdf59a470d6d11bce3854971a751ff2dfde2))
- Updated docs ([12e4aa8](https://github.com/karmaniverous/smoz/commit/12e4aa8e9d40fa82ef185087177c9fa657f8f013))
- Updated package keywords & description ([4f78341](https://github.com/karmaniverous/smoz/commit/4f783414fe2aedea5e0120c3d9e8c5cdddd7fcb7))
- Categorize by category ([07e54b0](https://github.com/karmaniverous/smoz/commit/07e54b05d03e2f895603bac41d59e11841f89205))
- Updated docs ([8bcfdd1](https://github.com/karmaniverous/smoz/commit/8bcfdd1c8856c16d7f4ee605f19f3a416f83dae4))
- Bugfix ([99f8415](https://github.com/karmaniverous/smoz/commit/99f8415b73403b57c6c45b7111c31edf5020d67e))
- Added changelog ([ab163a3](https://github.com/karmaniverous/smoz/commit/ab163a3274b48fba2d6305f3cbd4f76078c25b89))
- Updated docs ([e8d4234](https://github.com/karmaniverous/smoz/commit/e8d42349610f672fa6b37c1cef0410ce9ace4092))
- Updated docs ([39ac5a0](https://github.com/karmaniverous/smoz/commit/39ac5a0c5ffe6123a27640572f0a995dc5b98e4f))
- Removed typedoc categories ([36c43a9](https://github.com/karmaniverous/smoz/commit/36c43a944013e0bfcf62c827e6f01124cf9e1beb))
- Reorganized repo ([25d8add](https://github.com/karmaniverous/smoz/commit/25d8addb284fa433ec701b3c311e4b539a03b63b))
- Updated stan ([d37e499](https://github.com/karmaniverous/smoz/commit/d37e4993f0815030e70a186b31d0b211b2f648d5))
- Suppress alias unresolved warnings; document cleanup completion ([1dc451d](https://github.com/karmaniverous/smoz/commit/1dc451d3518fdbd3fefee1cbf0ed71b8c0fcc05f))
- Add precise move plan for functions layout ([2726887](https://github.com/karmaniverous/smoz/commit/2726887859c192b73b513a1126ebba61de29261f))
- Reorganized app directory ([728b2c8](https://github.com/karmaniverous/smoz/commit/728b2c858b7cf3a6c3dcb4db405bd2c2da014b96))
- Migrate endpoints to functions and fix wiring

When: 2025-09-04T12:44:00Z

Why: After moving endpoint modules under app/functions, builds failed due to
stale imports and deleted endpoints/_root. This commit updates imports, computes
endpointsRootAbs from APP_ROOT_ABS, and writes OpenAPI to app/generated.

What changed:
- app/config/app.config.ts — export APP_ROOT_ABS for reuse by lambdas.
- app/config/openapi.ts — import from app/functions; ensure outDir and write
  app/generated/openapi.json.
- serverless.ts — switch side-effect imports to app/functions paths.
- app/functions/*/*/lambda.ts — drop endpoints/_root; compute endpointsRootAbs
  via join(APP_ROOT_ABS, 'functions', token); add targeted lint disable.
- app/functions/rest/openapi/get/handler.ts — import generated OpenAPI from
  app/generated/openapi.json.
- package.json — update openapi script to prettify app/generated/openapi.json.
- .stan/system/stan.todo.md — record applied move plan and wiring updates. ([e1b95e7](https://github.com/karmaniverous/smoz/commit/e1b95e7f685d29b602f23dc807e5b1eb497b7318))
- Codify unsafe rule policy; no inline disables ([e823eab](https://github.com/karmaniverous/smoz/commit/e823eabbe1fb346c957f36abff1d381a84f4fe95))
- Require descriptions on disables; justify existing ones ([7c1cf13](https://github.com/karmaniverous/smoz/commit/7c1cf13f40bba8c73254acf404e914abd184488e))
- Fix plugin types/options; justify and dedupe disables ([9baa2ba](https://github.com/karmaniverous/smoz/commit/9baa2bab037d1621ce7073d83ac0327484fa9deb))
- Type the comments plugin and narrow registration for TS ([e37d2d5](https://github.com/karmaniverous/smoz/commit/e37d2d5c959d0d36237cb6e6999661396b9de3d6))
- Detail templates and CLI design (next steps) ([ec2d618](https://github.com/karmaniverous/smoz/commit/ec2d6182a8759d9b8415d064e8e3ba802fc4831c))
- Updated todo ([74218ff](https://github.com/karmaniverous/smoz/commit/74218ffafaf6e6e051c366825c737fd7284847b4))
- Switch to CLI-generated registers for OpenAPI/SL

When: 2025-09-06T17:20:00Z
Why: Align runtime aggregation with the CLI “register” workflow so
endpoints are discovered via generated side-effect imports. Keeps
serverless and OpenAPI composition stable as functions evolve.

What changed:
- serverless.ts: import app/generated/register.functions and
  register.serverless; remove hard-coded per-endpoint imports.
- app/config/openapi.ts: import app/generated/register.openapi; remove
  direct endpoint imports.
- .stan/system/stan.todo.md: mark the register-based loading step as
  completed; update timestamp and Next up list.

Notes:
- After building the CLI (npm run cli:build), run the register step to
  generate app/generated/register.*.ts before packaging or generating
  OpenAPI. ([a54e378](https://github.com/karmaniverous/smoz/commit/a54e378877d1b1db2ddfeeae4ac5b1f4eca504c5))
- Seed generated register placeholders; fix imports

When: 2025-09-06T17:35:00Z
Why: serverless.ts and app/config/openapi.ts now depend on CLI-generated
register files. Typecheck/build/package failed because those files were
absent. Seeding placeholders allows builds to pass until `smoz register`
is run.

What changed:
- app/generated/register.functions.ts: add placeholder (export {}).
- app/generated/register.openapi.ts: add placeholder (export {}).
- app/generated/register.serverless.ts: add placeholder (export {}).
- .stan/system/stan.todo.md: update timestamp; note completion of
  placeholder seeding. ([d693d17](https://github.com/karmaniverous/smoz/commit/d693d173379b8bda88c32070fe8d8c53f9077e2b))
- Switch to app/functions and CLI registers ([10b9c11](https://github.com/karmaniverous/smoz/commit/10b9c1168a9a308b59afe990b473dd9b914efb3e))
- Knip hygiene for pre-register sources and CLI bin

When: 2025-09-06T17:55:00Z
Why: knip flagged app/functions lambda/openapi files as unused before
registers are generated, and reported the CLI bin “smoz” as an unlisted
binary. These are intentional and should not cause noise.

What changed:
- knip.json:
  - Added ignores for app/functions/**/lambda.ts and **/openapi.ts (these
    are discovered via CLI-generated registers).
  - Added “smoz” to ignoreBinaries to suppress the unlisted bin warning.
- .stan/system/stan.todo.md:
  - Updated timestamp and documented knip hygiene as completed. ([6e949b5](https://github.com/karmaniverous/smoz/commit/6e949b5ceb904bd0a1b424645e20e40173c0381d))
- Dev plan: mark templates acceptance completed

When: 2025-09-06T18:05:00Z
Why: The final acceptance item for templates (typecheck, lint, empty
tests OK, docs tooling loads) is satisfied; no remaining Next up items.

What changed:
- .stan/system/stan.todo.md: bumped timestamp; moved “Templates
  authoring (packaged assets)” to Completed and removed the empty
  Next up section. ([9046262](https://github.com/karmaniverous/smoz/commit/9046262aa889f839ab179b958f467e14ad525c8a))
- Npm install ([d21fd9d](https://github.com/karmaniverous/smoz/commit/d21fd9d4eca145a90702c3a96fabbc09ab88b978))
- *(register)* Add debounced watch helper and tests ([295f045](https://github.com/karmaniverous/smoz/commit/295f0454d9139aaa07f0bdb9b3c8b211c1566161))
- Updated docs ([f16c89d](https://github.com/karmaniverous/smoz/commit/f16c89d3ed452bb85293ab284ac310184878cd4f))
- *(add)* Scaffold path params; docs pre-commit snippet ([64a6152](https://github.com/karmaniverous/smoz/commit/64a6152db20cdfe460373bc469243a4ad6493d26))
- *(add)* Normalize path params; docs consumption guide ([6235816](https://github.com/karmaniverous/smoz/commit/6235816d6ef58df62cd9575b0b60779331af9ff3))
- Updated docs ([f59cb07](https://github.com/karmaniverous/smoz/commit/f59cb0744e11539001e7150eb0d40a2dae80b909))
- Updated docs ([ee4f1ba](https://github.com/karmaniverous/smoz/commit/ee4f1ba6d88c6c767bdd8d7452c2d3e99b844ace))
- *(dev)* Fix types/lint; add inline server and offline runner ([3379174](https://github.com/karmaniverous/smoz/commit/33791741d422774f65ee7a074e2b157d93c59dbd))
- *(dev)* Fix typing/lint; inline/offline server lint cleanups ([2a0f788](https://github.com/karmaniverous/smoz/commit/2a0f788dd6d82af44d1c52f056c9d0cc43906963))
- Inline backend tests and docs default to `smoz dev` ([3824218](https://github.com/karmaniverous/smoz/commit/3824218405555940445ef794116ddad51dfcf7a6))
- Installed serverless-offline ([7fbaef1](https://github.com/karmaniverous/smoz/commit/7fbaef1df59c2475620f2eb862791bf7c167e692))
- Widen temp env and add diagnostics ([36f3e2b](https://github.com/karmaniverous/smoz/commit/36f3e2b7f271e1d0d41e7ea73ec921ac00e64afc))
- Single-start inline and conditional restart ([e3c9881](https://github.com/karmaniverous/smoz/commit/e3c9881d1d484264040c5cd9c11286530dccc4e0))
- Seed env from app config for inline mode ([be25451](https://github.com/karmaniverous/smoz/commit/be25451dbc56dee84244f73b5c0ca0473698ce78))
- Fix lint in env seeding and inline restart guard ([c1fc613](https://github.com/karmaniverous/smoz/commit/c1fc613e5851116cb62607a7ed8b9e8f9631ee60))
- Resolved build comment issue ([ada0e61](https://github.com/karmaniverous/smoz/commit/ada0e61d7a5b2508e221c92880937a6e7fb16624))
- Updated docs ([ab571cd](https://github.com/karmaniverous/smoz/commit/ab571cda9ef0063887b89815f79dfe8819461d6d))
- Updated readme ([e785856](https://github.com/karmaniverous/smoz/commit/e7858561456f3453827b58296101f924c6e8f66f))
- Updated docs ([dddde21](https://github.com/karmaniverous/smoz/commit/dddde216f6809d93a353a119ad74f9440a72a514))
- Updated docs ([def2be8](https://github.com/karmaniverous/smoz/commit/def2be831f4f3e379e8abf94a29d528c90a88e96))
- Updated docs ([cf3d81d](https://github.com/karmaniverous/smoz/commit/cf3d81d4ffe48710e6dd299dcdb99841f127571b))
- Updated docs ([e624b30](https://github.com/karmaniverous/smoz/commit/e624b306b6258f2c3593fad09cdf5303c7189729))
- Updated knip config ([2232691](https://github.com/karmaniverous/smoz/commit/2232691378974eb43c43a883bb1c846777e28def))

### 🚜 Refactor

- DI to remove toolkit→stack deps; add env adapter ([b3d1454](https://github.com/karmaniverous/smoz/commit/b3d145493b9970fefec73422bb774d06700616da))
- *(config)* Interface-first unifier; rename APIs for clarity (v0) ([deb0e32](https://github.com/karmaniverous/smoz/commit/deb0e32c373524b1741b57865ffe2b057edbb219))
- *(handler)* Bind env to function configs; simplify wrapper API ([a128bb3](https://github.com/karmaniverous/smoz/commit/a128bb38e951b043ac1b1d4ad79431309eeb12fc))
- *(app)* Remove any in handler wiring; internalize serverless functions cast ([48d4fa1](https://github.com/karmaniverous/smoz/commit/48d4fa1800cac3b4103979feab39c64376fa64b1))
- Fix types/lint; prep App split ([d3ed338](https://github.com/karmaniverous/smoz/commit/d3ed33841b23b81b3d7dbf1e60f58a95683357b2))
- *(app)* Begin App.ts split; extract helpers; fix lint ([908e929](https://github.com/karmaniverous/smoz/commit/908e9293fdde035e7af5af55a0e111dcbd0ee2b5))
- *(app)* Delegate registry to src/app/registry.ts ([7c156e8](https://github.com/karmaniverous/smoz/commit/7c156e8d8d29631a3055f0b0b25e543592ef16e5))
- Split HTTP customization; fix App.ts and typings ([d8c5b18](https://github.com/karmaniverous/smoz/commit/d8c5b186c81661e903fa6f8cefe1f78d1ef2d560))
- Drop back-compat shims; pass compute args only when defined ([e0aedf7](https://github.com/karmaniverous/smoz/commit/e0aedf7b1c247919de17160bc3a4239c0c35f76b))
- *(core)* Slim App.ts via helpers; keep API stable ([1f4f998](https://github.com/karmaniverous/smoz/commit/1f4f9982816997840dfdfffedf30906d84e70a34))
- *(core)* Fix App.ts types after slimming; build clean ([6003d0d](https://github.com/karmaniverous/smoz/commit/6003d0dd945234c85472d3be0abbf3df6f46ef54))
- Schema-first cleanup for base event types and tokens ([59d9099](https://github.com/karmaniverous/smoz/commit/59d9099b74b3d43b39048cbe3539004235bea07e))
- Schema-only public API; fix base events; remove cruft ([495b330](https://github.com/karmaniverous/smoz/commit/495b330884780ed693ef1a887e1ef34f1078da8e))

### 📚 Documentation

- Specify App singleton + registry; slug generator; break old APIs ([98401aa](https://github.com/karmaniverous/smoz/commit/98401aafb90e03c59c1c4defa34477287484d239))
- Refresh dev plan and queue knip cleanup ([ec1fbe8](https://github.com/karmaniverous/smoz/commit/ec1fbe864882e8da5989531071fe6771d7e7ff54))
- README overhaul + TSDoc on public API (Phase 1) ([0add650](https://github.com/karmaniverous/smoz/commit/0add6503bb692a71233bdc1307ad673328751cab))
- TSDoc Phase 2 across core utilities and internals ([fdd23cc](https://github.com/karmaniverous/smoz/commit/fdd23cc7eb8b1701c0dd540135ddbea0082a8ccf))
- *(typedoc)* Export referenced types from entrypoint ([1eb160f](https://github.com/karmaniverous/smoz/commit/1eb160f5620a3b4cf6c9fe7d45dfb6e4839e243d))
- HTTP middleware customization; prune dev plan ([c307ebd](https://github.com/karmaniverous/smoz/commit/c307ebdd3fca4715d4778ff2e4cddc0021be4cce))
- *(typedoc)* Expand entry points for deep linking; keep internals ([22bee04](https://github.com/karmaniverous/smoz/commit/22bee04158234d46aeecb6909d4ca98dee23e743))
- Categorize TypeDoc and order with Public API first ([cf2a4c7](https://github.com/karmaniverous/smoz/commit/cf2a4c7c89f9825f972b28ce07d03fe19811358a))
- *(typedoc)* Export internal types and fix broken links ([7ff2d93](https://github.com/karmaniverous/smoz/commit/7ff2d93fe2b978452d5587bedbcb2a7eb7b08d7b))
- Record typedoc cleanup completion in plan ([afee7ff](https://github.com/karmaniverous/smoz/commit/afee7ffcf7ba84d203467aa9a5f77c58585ac187))
- Enable TypeDoc source links; fix CT test runtime throw ([162dcb2](https://github.com/karmaniverous/smoz/commit/162dcb21661ceb34bdf82f2eff5bcbe4f254d303))
- Enable TypeDoc source links; fix CT test runtime throw ([d005bbc](https://github.com/karmaniverous/smoz/commit/d005bbc1e12aff4e7f238b3b3579753a2edc0bdb))
- Define CLI requirements and reset plan ([d53f0df](https://github.com/karmaniverous/smoz/commit/d53f0df4a23a127928f967190bb3306fc3bd2618))
- *(plan)* Record CLI slice 3 (add command) completion ([6aad915](https://github.com/karmaniverous/smoz/commit/6aad9151533a974a214ddf2c5225f6609191dc65))
- Refresh dev-plan timestamp; record move workflow ([bafbaf8](https://github.com/karmaniverous/smoz/commit/bafbaf8473012efb630a6a578cf57c0867ca7d85))
- *(plan)* Refine Next up with actionable steps ([52d8ff5](https://github.com/karmaniverous/smoz/commit/52d8ff536b3ddda1d3c68f5863a8e21aeed55876))
- *(template)* Add minimal README to templates/project ([f67da81](https://github.com/karmaniverous/smoz/commit/f67da81fb709a37f1be008b729d0861e7cd1b88e))
- Add routing guardrails and next-up plan ([3cb144b](https://github.com/karmaniverous/smoz/commit/3cb144b9ae8f2e4b27fc8212457b6f5f9a209f63))
- *(templates)* Add cross‑platform path hygiene note ([cce8e96](https://github.com/karmaniverous/smoz/commit/cce8e96e53d3b919adda1b12f150e5e4069614a9))
- Split README content into docs-src + unify template lint/typecheck ([1e9f235](https://github.com/karmaniverous/smoz/commit/1e9f235d1a225a4613fed3a5d349d60569ddc8ff))
- Slim README and link to docs pages ([a7a89cb](https://github.com/karmaniverous/smoz/commit/a7a89cb193416d62b7cb8f2a1ea5bce19d37ecf7))
- *(project)* Compress project prompt; keep anchors; clarify install guard ([307953b](https://github.com/karmaniverous/smoz/commit/307953b4016789f6316015581fd48ac2a11a434e))
- *(templates)* Memorialize register placeholders policy ([2913036](https://github.com/karmaniverous/smoz/commit/29130369e53c12fcc0724fd93629c6e57c715a47))
- *(templates)* Explain register imports; add inline comments ([c418c9f](https://github.com/karmaniverous/smoz/commit/c418c9fa21f430a27f1f9ff2105f6c4ea1db8707))
- *(policy)* Keep /app fixture; prefer serverless plugin; doc structure ([7b3ca7e](https://github.com/karmaniverous/smoz/commit/7b3ca7ea1619f35ee09de061fe4e099e5c1b8715))
- Front matter, typedoc order, path params ([fd18b40](https://github.com/karmaniverous/smoz/commit/fd18b400d14522c283f24d43af491e53dacf3ae2))
- Add Why, Tour, and Recipes; wire into navigation ([d8c957f](https://github.com/karmaniverous/smoz/commit/d8c957f9cd50f49a2f7996b9ad751fe4e3c13061))
- *(examples)* Seed examples area and rest-only guide ([9386765](https://github.com/karmaniverous/smoz/commit/93867654b4d6723715349d6b6269dff8ad1bb3b4))
- *(examples)* Add rest-sqs and rest-step guides; update index ([189d553](https://github.com/karmaniverous/smoz/commit/189d5534c4d75c141a37ba7a17a0e80e4a03a841))
- Cross-link examples from Recipes index ([e8d7ea7](https://github.com/karmaniverous/smoz/commit/e8d7ea75b4e30e4fa6050b2cb665fb32a5c7ebec))
- Add Examples link to README; update plan ([3a68970](https://github.com/karmaniverous/smoz/commit/3a689700a8eaf6c24866c8906549f1b4efec1bb3))
- Nest recipe pages under Recipes via children front matter ([6ca36ad](https://github.com/karmaniverous/smoz/commit/6ca36ada286fc2eb998a90b063a929767fd5c9d0))
- *(cli)* Define dev/openapi plan; remove register --watch ([ecfb846](https://github.com/karmaniverous/smoz/commit/ecfb8467522617c5043541da17da615fc11e51ef))
- *(types)* Adopt aws-lambda event/result types in dev adapters ([c1dea67](https://github.com/karmaniverous/smoz/commit/c1dea6743e1f226619c8a59f3d0b73d817efa3e1))
- *(cli)* Add dev loop and remove watch flag ([a40310c](https://github.com/karmaniverous/smoz/commit/a40310c43518b39efed722c0df8d2d9e3b433d70))
- *(cli)* Default `npx smoz dev`; offline as opt-in ([f6cf92b](https://github.com/karmaniverous/smoz/commit/f6cf92baef4adaede63e26dd34cb44b3114dba6f))
- Update dev plan for env seeding + lint fixes ([9a649f9](https://github.com/karmaniverous/smoz/commit/9a649f982435e5c1b1be2569730b3f0bec85f96a))
- Align install/import usage; fix minor TypeDoc glitches ([8cf9307](https://github.com/karmaniverous/smoz/commit/8cf9307d5b549e0f91e2c12d1fcd63928676832a))

### 🧪 Testing

- Tests passing! ([1fe8a9f](https://github.com/karmaniverous/smoz/commit/1fe8a9fc7c53cbb5f4e0c208026aedc01957f15f))
- Test helpers ([f9ed1c5](https://github.com/karmaniverous/smoz/commit/f9ed1c5af54616ec7abdfac4acf0296524de1a69))
- Test fixture ([bbfc9e0](https://github.com/karmaniverous/smoz/commit/bbfc9e091a4fc9d7c13551856e2e6f333dbaf38c))
- Test lefthook ([7cf1154](https://github.com/karmaniverous/smoz/commit/7cf11547ef7b12042004114d4254fdbdff073e2a))
- *(snap)* Fix selection-sync mock hoist; stabilize tar call capture ([dd5a7e2](https://github.com/karmaniverous/smoz/commit/dd5a7e2c0f9555dc2e4f7844612c980fa926be0e))
- Add coverage for HTTP customization and transform helpers ([1b21d14](https://github.com/karmaniverous/smoz/commit/1b21d14ce9571b8b9334d2232d53d52ed54d02ed))
- Refactor fixtures to mirror DX; add config runtime/CT tests ([d74ab7a](https://github.com/karmaniverous/smoz/commit/d74ab7aa306e67a16138b24e97c798f075ec25ea))
- Fix CT tests and remove unused fixture; mirror DX ([fa80078](https://github.com/karmaniverous/smoz/commit/fa8007834a2964ef6083973ceebf5bbf7e1c6d49))
- Add CLI and aggregator tests; docs: path hygiene ([636a879](https://github.com/karmaniverous/smoz/commit/636a879603d7c19b92695a141442aefa493ee652))
- Make serverless tests OS‑portable; loosen register import assertion ([cc8c5c0](https://github.com/karmaniverous/smoz/commit/cc8c5c0e2e021ffdde0d9e197eeab6ad4316d4fe))
- Fix Windows URLs; relax register import ([d7dfd2b](https://github.com/karmaniverous/smoz/commit/d7dfd2ba318e02fe4755c878667c2a0464782985))
- Align serverless path expectation; apply knip hints ([b36a1d7](https://github.com/karmaniverous/smoz/commit/b36a1d76d0dbd38a86843859c06225b24e3e54d9))
- Fix watch helper test for strict TS config ([e02f72c](https://github.com/karmaniverous/smoz/commit/e02f72c6ec9ce9e037cded654063fdfe6fad9309))
- *(cli)* Add path params scaffolding test ([b31a700](https://github.com/karmaniverous/smoz/commit/b31a700fcc891aab2ae7a656733c5e8ca79fbc28))
- *(cli)* Quote-agnostic assertions for path params ([aa7fe2a](https://github.com/karmaniverous/smoz/commit/aa7fe2aa13c48a958c5392e3ea2a55049b83eb61))
- *(cli)* Relax params regex to allow extra fields ([c0829ad](https://github.com/karmaniverous/smoz/commit/c0829ad6613acb7d5b169e1dc06ad378d803dff6))
- *(inline)* Fix spawn CLI detection, typing, and lint issues ([37095b0](https://github.com/karmaniverous/smoz/commit/37095b0cdd696ac3fb0beda03cde1477c10182e6))

### ⚙️ Miscellaneous Tasks

- Clean up development plan ([5985837](https://github.com/karmaniverous/smoz/commit/5985837964c1c26fe9f35babb3dcd2785ced3829))
- *(build)* Reduce stan:build warnings; fix type guard ([831f13c](https://github.com/karmaniverous/smoz/commit/831f13ca1e96b5b15c901f23f51313e3ffdbd9a7))
- Make typecheck repo-wide no-emit; stabilize rollup tsconfig ([50aa7fb](https://github.com/karmaniverous/smoz/commit/50aa7fb6b84dfba153bd6e61bc33ef19cb7ae4c1))
- Consolidate to single package; simplify generate script ([34dc7ce](https://github.com/karmaniverous/smoz/commit/34dc7ce1c2bad331157b8520327326504368bee1))
- Remove demo package.json/tsconfig; update ESLint ([a0d3e4e](https://github.com/karmaniverous/smoz/commit/a0d3e4e9f1a3ebafec7df920fa358d7212f8dccf))
- *(devplan)* Lint fix in buildOpenApi; slug export cleanup ([4ca8b78](https://github.com/karmaniverous/smoz/commit/4ca8b78df9c3a91dd104ce083bd7635c6a27da11))
- *(app)* Remove obsolete stages aggregator ([3aec49a](https://github.com/karmaniverous/smoz/commit/3aec49a4ba32f322258e987a863b72c1e7aedea9))
- *(knip)* Phase 1 config cleanup and ignores ([00c09bd](https://github.com/karmaniverous/smoz/commit/00c09bd4f06e95c0182b67aade10e15151a962eb))
- Remove unused modules (triage phase 1) ([de947da](https://github.com/karmaniverous/smoz/commit/de947dad31024058c0c67277e6ee8a38afa4ff1a))
- *(knip)* Single workspace; ignore intrinsic; keep file ([8f1f7af](https://github.com/karmaniverous/smoz/commit/8f1f7afa66cea75f79cf97111aeefb78965bf4db))
- Knip cleanup and dev plan pruning ([618346a](https://github.com/karmaniverous/smoz/commit/618346a9f67c86a375827261d98e4f1310bd2544))
- *(knip)* Resolve unlisted binaries; prune dev plan ([3d0a088](https://github.com/karmaniverous/smoz/commit/3d0a0889359b1df08d5575c6fb8b0d81fde16b0d))
- Refresh dev plan after passing scripts ([ffad468](https://github.com/karmaniverous/smoz/commit/ffad468ba162e47e2d7cff8fda82bace329f6828))
- Trim public API and align test fixtures ([56d8322](https://github.com/karmaniverous/smoz/commit/56d83228afe8fc940912c01702f88296acd1ce78))
- *(docs)* Fix wrapHandler JSDoc link; tidy stage artifacts docs ([f8b8c2e](https://github.com/karmaniverous/smoz/commit/f8b8c2ea3b815bf71b86443a47ae35d486c758a0))
- Fix lint/typecheck/docs by excluding templates; rootDir; lint ([250f531](https://github.com/karmaniverous/smoz/commit/250f531e870d900254ecd07f1e146dda4a540384))
- *(plan)* Prune/tidy TODO; feat(init): copy shared project boilerplate ([4a25512](https://github.com/karmaniverous/smoz/commit/4a25512e34ef1da43cdd1a27f2ee846b8c86a622))
- Move dir-change mechanics to project prompt; prune TODO; continue templates ([2706df8](https://github.com/karmaniverous/smoz/commit/2706df8167c3fc038c3e27074239923d52b1f3b3))
- *(eslint)* Drop eslint-plugin-eslint-comments ([32c15e4](https://github.com/karmaniverous/smoz/commit/32c15e4d61e74c0a7547e1f99320aa2dfedd4010))
- Remove eslint-comments shim and update plan ([6a8429b](https://github.com/karmaniverous/smoz/commit/6a8429b42daccbe9c4dbf6fcd9926bb2176ee34f))
- *(init)* Remove final unnecessary optional chains ([30fc757](https://github.com/karmaniverous/smoz/commit/30fc757692347074e5793907f785d51e71347268))
- *(init)* Explicit install predicate to satisfy lint ([17c1ec0](https://github.com/karmaniverous/smoz/commit/17c1ec0a85a0ad15d3789fcae59c942ce8e4ecfe))
- *(plan)* Add lint-zero task and refine next steps ([2768a07](https://github.com/karmaniverous/smoz/commit/2768a07603deca855971799803e750bc3850bc11))
- Progress dev plan; fix init lint and refresh TODO ([5f3fda8](https://github.com/karmaniverous/smoz/commit/5f3fda8b61082683994a370bb2a8bb812de11f60))
- *(plan)* Mark lint-zero done; renumber next steps ([a4dd06f](https://github.com/karmaniverous/smoz/commit/a4dd06fb97c61e344fa62831f0c808dc67639eea))
- *(todo)* Prune completed items and focus templates checks ([5fe55dd](https://github.com/karmaniverous/smoz/commit/5fe55dd1c92d4399dbd93e853105904545cb402d))
- *(build)* Suppress alias unresolved warnings in DTS bundling ([1e52577](https://github.com/karmaniverous/smoz/commit/1e5257735f83325d56b4c47e90d7d7d644bd87c6))
- *(dev)* Resolve '@karmaniverous/smoz' in templates via tsconfig paths ([48afab0](https://github.com/karmaniverous/smoz/commit/48afab0c126e1db59fd8a5087eb7a95b3f725a14))
- Fix templates typecheck/lint wiring; add CONTRIBUTING stub ([574c121](https://github.com/karmaniverous/smoz/commit/574c121e3c6cc631c28e81228d4888f623cba473))
- Fix templates:lint glob and update dev plan ([fe64d16](https://github.com/karmaniverous/smoz/commit/fe64d16f2181dfe0ae609d4b14049ecbbf464dd4))
- *(build)* Suppress alias UNRESOLVED_IMPORT warnings reliably ([914b2f6](https://github.com/karmaniverous/smoz/commit/914b2f6a6a12b0995877d691642d674533fb0516))
- *(templates)* Ensure ESLint covers config file under stan run ([8751510](https://github.com/karmaniverous/smoz/commit/8751510e21ece30f1252431fbcfc4805ed90a78e))
- *(ci)* Run `smoz register` before typecheck ([f5a6d56](https://github.com/karmaniverous/smoz/commit/f5a6d569afc45182192519663c69892f8cb4d1c6))
- *(templates)* Print full tsc diagnostics on typecheck failure ([985ffdf](https://github.com/karmaniverous/smoz/commit/985ffdf08875c476317c644a697c2c2f96a72d9e))
- *(templates)* Tighten template tsconfig; improve diagnostics ([83dbc5b](https://github.com/karmaniverous/smoz/commit/83dbc5b853d798bc6ec48b4417c3f059647900ed))
- Close templates:typecheck loop; keep loop guard ([8d0ef62](https://github.com/karmaniverous/smoz/commit/8d0ef62e8e58ad457ad165c52af678bfe370fe34))
- Release v0.1.0 ([b959bfc](https://github.com/karmaniverous/smoz/commit/b959bfc2cef31264c898c7fd934a87427d2b9722))
