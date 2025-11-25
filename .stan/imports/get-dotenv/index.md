---
title: Plugins
children:
  - ./aws.md
  - ./batch.md
  - ./cmd.md
  - ./init.md
  - ./demo.md
---

# Plugins

This section documents the plugins shipped with the get‑dotenv CLI:

- [AWS](./aws.md) - Resolve profile/region and acquire credentials; mirrors to process.env and ctx; includes an `aws` subcommand for session and forwarding.
- [Batch](./batch.md) - Execute a command across multiple working directories under the current dotenv context.
- [Cmd](./cmd.md) - Execute a single command under the current dotenv context; includes a convenient parent‑level `--cmd` alias.
- [Init](./init.md) - Scaffold config files and a host‑based CLI skeleton with safe collision flow (interactive and CI heuristics).
- [Demo](./demo.md) - Educational plugin showing context access, child exec with explicit env injection, and scripts/shell resolution.

## Quickstart

```ts
#!/usr/bin/env node
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins';

const program: Command = new GetDotenvCli('mycli').use(batchPlugin());
await (program as unknown as GetDotenvCli).resolveAndLoad();
await program.parseAsync();
```

- `resolveAndLoad()` produces a context `{ optionsResolved, dotenv, plugins? }`.
- The host registers a preSubcommand hook to ensure a context exists when subcommands run (e.g., batch).

## Wiring included plugins (cmd, batch, aws, init)

This library ships a small set of ready‑to‑use plugins. Most projects want the same baseline:

- Root flags (`-e/--env`, `--paths`, `--strict`, `--trace`, etc.)
- A “cmd” command (and parent alias `-c, --cmd <command...>`) for one‑off commands
- The “batch” command for running a command across many working directories
- The AWS base plugin to establish a session and make it available to children
- The “init” plugin for scaffolding config and a CLI skeleton

Here is a minimal host that wires all of the above.

```ts
#!/usr/bin/env node
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import {
  cmdPlugin,
  batchPlugin,
  awsPlugin,
  initPlugin,
} from '@karmaniverous/get-dotenv/plugins';

const program = new GetDotenvCli('toolbox');

// Optional: nice help header (uses your package.json version when importMetaUrl is provided)
await program.brand({
  importMetaUrl: import.meta.url,
  description: 'Toolbox CLI',
});

// 1) Attach base root options (-e/--env, --paths, --strict, --trace, etc.)
// 2) Install included plugins
// 3) passOptions() merges root flags (parent < current), computes the dotenv context
//    once per invocation, runs validation, and persists merged options for nested flows.
program
  .attachRootOptions({ loadProcess: false })
  .use(cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }))
  .use(batchPlugin())
  .use(awsPlugin())
  .use(initPlugin())
  .passOptions({ loadProcess: false });

await program.parseAsync();
```

Helpers availability

- The root‑level base flag installer and one‑shot options merger are available whenever you import the host:
  - `program.attachRootOptions(...)`
  - `program.passOptions(...)`
- No additional imports are required; these helpers are unconditional for `@karmaniverous/get-dotenv/cliHost`.

Note: Per‑plugin subpaths (e.g., `@karmaniverous/get-dotenv/plugins/cmd`) remain available, but the plugins barrel is recommended to share a single type identity with `cliHost` and simplify imports.

### Configure included plugins (JSON/TS config)

Put defaults under getdotenv.config.\*. The loader overlays packaged → project/public → project/local and then applies dynamic (when present). Plugin slices live under the `plugins` key.

JSON example:

```json
{
  "paths": "./",
  "dotenvToken": ".env",
  "privateToken": "local",
  "plugins": {
    "batch": {
      "scripts": {
        "build": { "cmd": "npm run build", "shell": "/bin/bash" },
        "plain": { "cmd": "node -v", "shell": false }
      },
      "shell": true,
      "rootPath": "./packages",
      "globs": "*",
      "pkgCwd": false
    },
    "aws": {
      "profile": "dev",
      "defaultRegion": "us-east-1",
      "loginOnDemand": true,
      "setEnv": true,
      "addCtx": true
    }
  }
}
```

TypeScript example (JS/TS allows dynamic too):

```ts
export default {
  plugins: {
    batch: {
      scripts: { build: { cmd: 'npm run build', shell: '/bin/bash' } },
      shell: false,
    },
    aws: {
      profileKey: 'AWS_LOCAL_PROFILE',
      regionKey: 'AWS_REGION',
      strategy: 'cli-export',
      loginOnDemand: true,
    },
  },
};
```

### Usage examples

- One-off command (alias on the parent):

```bash
toolbox -e dev -c 'node -e "console.log(process.env.APP_SETTING ?? \"\")"'
```

- Batch across workspaces:

```bash
toolbox batch -r ./services -g "web api" -l
```

- AWS session + optional forwarding:

```bash
# session only (populate process.env and ctx.plugins.aws)
toolbox aws --profile dev --login-on-demand

# forward to AWS CLI (tokens after -- are passed through)
toolbox aws -- sts get-caller-identity
```

### Branding the host CLI

Use the branding helper to set the CLI’s name/description and automatically display the version in help when branding is active. When you provide `importMetaUrl`, the host resolves the nearest package.json and uses its `version`. If you don’t pass a `helpHeader`, the host prints a sensible default `<name> v<version>` as a header.

```ts
#!/usr/bin/env node
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';

const program: GetDotenvCli = new GetDotenvCli('toolbox');
await program.brand({
  importMetaUrl: import.meta.url, // resolves version from your package.json
  description: 'Toolbox CLI', // optional
  // helpHeader: 'My Toolbox v1.2.3', // optional; default uses "<name> v<version>"
});

// … wire options/plugins …
await program.parseAsync();
```

Notes and behavior details:

- The shipped getdotenv binary is implemented via `createCli(...).run(argv)`. To keep `-h/--help` deterministic and avoid `process.exit`, the binary prints help and returns before branding runs. As a result, the header may be omitted for top‑level `-h/--help`.
- If you need a branded header in help, either:
  - run `getdotenv help` (which flows through normal parsing and branding), or
  - author your own host (as in the example above) and call `brand()` before `parseAsync()`.

## Adding app/root options and consuming them from a plugin

You can add your own root options and group them under “App options” in help using `tagAppOptions`. Install base flags and merging with `attachRootOptions().passOptions()` so values flow into the merged options bag:

```ts
import type { Command } from 'commander';
import {
  GetDotenvCli,
  readMergedOptions,
} from '@karmaniverous/get-dotenv/cliHost';
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

const program: GetDotenvCli = new GetDotenvCli('mycli');
await program.brand({ importMetaUrl: import.meta.url, description: 'My CLI' });

program
  .attachRootOptions() // install base flags (-e, --paths, etc.)
  .tagAppOptions((root) => {
    root.option('--foo <value>', 'custom app option'); // appears under "App options" in -h
  })
  .use(
    definePlugin({
      id: 'print',
      setup(cli) {
        cli.ns('print').action((_args, _opts, thisCommand) => {
          // Read the merged root options bag. Custom keys flow through.
          const bag = readMergedOptions(thisCommand) ?? {};
          const foo = (bag as unknown as { foo?: string }).foo;
          console.log(`foo=${foo ?? ''}`);
        });
      },
    }),
  )
  .passOptions(); // merge flags (parent < current), compute dotenv context

await program.parseAsync();
```

Example:

```bash
mycli -e dev --foo bar print
# -> foo=bar
```

Notes:

- `tagAppOptions` only affects help grouping; values are parsed by Commander and merged by `passOptions()`.
- Use `readMergedOptions(thisCommand)` in actions (or `cli.getOptions()` from code that has a handle on the host) to read the merged options bag. Custom keys are present at runtime even if not in the default type.

## Writing a plugin

```ts
import type { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

export const myPlugin = definePlugin({
  id: 'my',
  setup(cli: GetDotenvCli) {
    cli
      .ns('my')
      .description('My commands')
      .action(async () => {
        const ctx = cli.getCtx?.();
        // Use ctx.dotenv or ctx.plugins['my']...
      });
  },
  async afterResolve(cli, ctx) {
    // Initialize any clients/secrets using ctx.dotenv
    // Attach per-plugin state under ctx.plugins by convention:
    ctx.plugins ??= {};
    ctx.plugins['my'] = { ready: true };
  },
});
```

Composition:

```ts
const parent = definePlugin({ id: 'parent', setup() {} })
  .use(definePlugin({ id: 'childA', setup() {} }))
  .use(definePlugin({ id: 'childB', setup() {} }));
```

Plugins install parent → children; `afterResolve` also runs parent → children.

## Passing env to subprocesses

Prefer passing the resolved env explicitly to subprocesses invoked by your commands:

```ts
import { execaCommand } from 'execa';

// inside a command action:
const ctx = cli.getCtx?.();
await execaCommand('node -e "console.log(process.env.MY_VAR)"', {
  env: { ...process.env, ...ctx.dotenv },
  stdio: 'inherit',
});
```

The shipped CLI uses a nested-CLI strategy by placing the merged CLI options on `process.env.getDotenvCliOptions` (JSON) so child `getdotenv` invocations can inherit the parent’s defaults and flags.

## Scaffolding a host-based CLI

Use the built-in scaffolder to create config files and a starter CLI:

```bash
# JSON config + .local + CLI skeleton named “acme”
getdotenv init . --config-format json --with-local --cli-name acme --force
```

Notes:

- Templates are shipped and copied verbatim (no inline codegen).
- Collision flow supports [o]/[e]/[s] and [O]/[E]/[S]; non-interactive defaults to `--yes` unless `--force`.
- The CLI skeleton replaces `__CLI_NAME__` tokens with your chosen name.
- Non-interactive detection and precedence:
  - Treated as `--yes` (Skip All) when stdin or stdout is not a TTY OR when a CI-like environment variable is present (`CI`, `GITHUB_ACTIONS`, `BUILDKITE`, `TEAMCITY_VERSION`, `TF_BUILD`).
  - Precedence is `--force` > `--yes` > auto-detect (non-interactive => Skip All).

## Config loader behavior

The plugin host and the generator use the config loader/overlay path by default (always-on). When no config files are present, the loader is a no-op. Validation runs once after Phase C (interpolation) and respects `--strict`; redaction/entropy diagnostics apply to `--trace` and `-l/--log` without altering runtime values. See the “Config files and overlays” guide (./config.md) for discovery, precedence, validation, and diagnostics.
