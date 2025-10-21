### Full Listing: README.md

````markdown
> Load, expand, and compose environment variables from a deterministic dotenv cascade, then execute commands under that context. Use `get-dotenv` as a library, a CLI, or a plugin-first host to build dotenv-aware tooling with cross‑platform shell control, CI‑friendly capture, and clear diagnostics.

# get-dotenv

[![npm version](https://img.shields.io/npm/v/@karmaniverous/get-dotenv.svg)](https://www.npmjs.com/package/@karmaniverous/get-dotenv)
![Node Current](https://img.shields.io/node/v/@karmaniverous/get-dotenv) <!-- TYPEDOC_EXCLUDE -->
[![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/get-dotenv)
[![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](https://github.com/karmaniverous/get-dotenv/tree/main/CHANGELOG.md)<!-- /TYPEDOC_EXCLUDE -->
[![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](https://github.com/karmaniverous/get-dotenv/tree/main/LICENSE.md)

Load environment variables with a cascade of environment-aware dotenv files. You can:

✅ Asynchronously load environment variables from multiple dotenv files.

✅ Segregate variables info distinct files:

- Public files (e.g. `.env`, `env.dev`, `env.test`) are synced with your git repository.
- Private files (e.g. `.env.local`, `env.dev.local`, `env.test.local`) are protected by `.gitignore`.
- Global files (e.g. `.env`, `env.local`) apply to all environments.
- Env files (e.g. `.env.dev`, `.env.dev.local`, `.env.test`, `.env.test.local`) apply to a specific environment.
- [Dynamic files](#dynamic-processing) (`.env.js`) export logic that dynamically & progressively generates new variables or overrides current ones.

✅ Dynamically specify which variables to load by type.

✅ Explicitly add variables to the loaded set.

✅ Extract the resulting variables to an object, `process.env`, a dotenv file, or a logger object, in any combination.

✅ Customize your dotenv file directories & naming patterns.

✅ Perform all of the above either programmatically or [from the command line](#command-line-interface), where you can also execute additional commands within the resulting context... including nested `getdotenv` commands that inherit the parent command's settings & context!

✅ [Execute batched CLI commands](#batch-command) across multiple working directories, with each command inheriting the `getdotenv` context.

✅ Set defaults for all options in a `getdotenv.config.json` file in your project root directory.

✅ Validate your final composed environment via config: JSON/YAML `requiredKeys` or a JS/TS Zod `schema`. Validation runs once after Phase C (interpolation). Use `--strict` to fail on issues; otherwise warnings are printed. See the [Config files and overlays](./guides/config.md) guide.

✅ Diagnostics for safer visibility without altering runtime values:

- Redaction at presentation time for secret-like keys (`--redact`, `--redact-pattern`).
- Entropy warnings (on by default) for high-entropy strings; gated by length/printability and tunable via `--entropy-*` flags. See [Config files and overlays](./guides/config.md).

✅ Clear tracing and CI-friendly capture:

- `--trace [keys...]` shows per-key origin (parent | dotenv | unset) before spawning.
- Set `GETDOTENV_STDIO=pipe` or use `--capture` to buffer child stdout/stderr deterministically. See [Shell execution behavior](./guides/shell.md).

✅ Cross-platform shells and normalized child environments: defaults to `/bin/bash` on POSIX and `powershell.exe` on Windows; subprocess env is composed once via a unified helper that drops undefineds and normalizes temp/home variables. See [Shell execution behavior](./guides/shell.md).

✅ [Generate an extensible `getdotenv`-based CLI](https://github.com/karmaniverous/get-dotenv-child) for use in your own projects.

`getdotenv` relies on the excellent [`dotenv`](https://www.npmjs.com/package/dotenv) parser and somewhat improves on [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) for recursive variable expansion.

You can always use `getdotenv` directly on the command line, but its REAL power comes into play when you use it as the foundation of your own CLI. This lets you set defaults globally and configure pre- and post-hooks that mutate your `getdotenv` context and do useful things like grab an AWS session from your dev environment and add it to the command execution context.

When you plug your own [`commander`](https://www.npmjs.com/package/commander) CLI commands into the `getdotenv` base, they will execute within all of the environmental context created above!

## Requirements

- Node.js >= 20 (this repository pins 22.19.0 for CI/reproducibility)

## API Reference

Generated API documentation is hosted at:

- https://docs.karmanivero.us/get-dotenv

The site is built with TypeDoc from the source code in this repository.

## Testing

This project uses Vitest with the V8 coverage provider. Run:

```bash
npm run test
```

## Installation

```bash
npm install @karmaniverous/get-dotenv
```

## Scaffold

You can scaffold config files and a host-based CLI skeleton using the built-in init command. Templates are shipped with the package and copied verbatim.

Examples:

```bash
# JSON config + .local variant, and a CLI skeleton named "acme"
npx getdotenv init . \
  --config-format json \
  --with-local \
  --cli-name acme \
  --force
```

```bash
# TypeScript config with a dynamic example; CLI named "toolbox"
npx getdotenv init ./apps/toolbox \
  --config-format ts \
  --cli-name toolbox
```

Collision flow (when a destination file exists):

- Interactive prompt: [o]verwrite, [e]xample, [s]kip, or their “all” variants [O]/[E]/[S].
- Non-interactive detection: Treated as `--yes` (Skip All) unless `--force` is provided (Overwrite All). Considered non-interactive when stdin or stdout is not a TTY OR when a CI-like environment variable is present (`CI`, `GITHUB_ACTIONS`, `BUILDKITE`, `TEAMCITY_VERSION`, `TF_BUILD`).
- Precedence: `--force` > `--yes` > auto-detect (non-interactive => Skip All).
- Options overview:
  - `--config-format <json|yaml|js|ts>`
  - `--with-local` to generate `.local` alongside public config (JSON/YAML)
  - `--cli-name <string>` for token substitution (`__CLI_NAME__`) in the CLI skeleton
  - `--force` to overwrite all; `--yes` to skip all

Notes:

- Templates are shipped with the package and copied verbatim.
- The CLI skeleton replaces `__CLI_NAME__` tokens with your chosen name.

## Usage

```js
import { getDotenv } from '@karmaniverous/get-dotenv';

const dotenv = await getDotenv(options);
```

Options can be passed programmatically or set in a `getdotenv.config.json` file in your project root directory. The same file also sets default options for the `getdotenv` CLI or any child CLI you spawn from it.

See the [child CLI example repo](https://github.com/karmaniverous/get-dotenv-child#configuration) for an extensive discussion of the various config options and how & where to set them.

## CLI embedding (createCli)

Prefer the named factory when you want to embed the get‑dotenv CLI in your own tool. It wires the plugin‑first host with the included plugins and returns a small runner.

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv';

// Build a CLI and run with your argv; alias appears in help.
await createCli({
  alias: 'mycli',
  // Optional: override the help header (otherwise “mycli v<version>” is used).
  branding: 'mycli v1.2.3',
}).run(process.argv.slice(2));
```

Notes:

- The host resolves dotenv context once per invocation and exposes subcommands: cmd, batch, aws, and init (see Guides below).
- Use `--trace [keys...]` and `--redact` for diagnostics without altering runtime values.
- Default shells are normalized across platforms: `/bin/bash` on POSIX and `powershell.exe` on Windows (overridable per‑script or globally).
- Help/exit behavior (important for embedding and tests):
  - To keep `-h/--help` deterministic across ESM/CJS and avoid Commander’s default `process.exit`, `createCli().run(['-h'])` prints help and returns without exiting the process.
  - Because help is printed before the internal `brand()` call runs, the optional branding header may be omitted when `-h/--help` is used at the top level. If you need a branded header, prefer `mycli help` (which runs through normal parsing) or construct and brand a host directly (see “Branding the host CLI” in Guides).
- Interop matrix (embedding in different module systems):
  - ESM dynamic:
    ```ts
    const { createCli } = await import('@karmaniverous/get-dotenv');
    await createCli({ alias: 'mycli' }).run(['-h']);
    ```
  - CommonJS require (using built outputs for smoke checks):
    ```js
    const { createCli } = require('@karmaniverous/get-dotenv/dist/index.cjs');
    createCli({ alias: 'mycli' }).run(['-h']);
    ```

## Dynamic Processing

This package supports the full [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) syntax, with some internal performance improvements. Dynamic variables can be authored in JS or TS.

Use the `dynamicPath` option to add a relative path to a Javascript module with a default export like this:

```js
export default {
  SOME_DYNAMIC_VARIABLE: (dotenv) => someLogic(dotenv),
  ANOTHER_DYNAMIC_VARIABLE: (dotenv) =>
    someOtherLogic(dotenv.SOME_DYNAMIC_VARIABLE),
  ONE_MORE_TIME: ({ DESTRUCTURED_VARIABLE, ANOTHER_DYNAMIC_VARIABLE }) =>
    DESTRUCTURED_VARIABLE + ANOTHER_DYNAMIC_VARIABLE,
};
```

If the value corresponding to a key is a function, it will be executed with the current state of `dotenv` as its single argument and the result applied back to the `dotenv` object. Otherwise, the value will just be applied back to `dotenv`. (Although if you're going to do that then you might as well just create a public global variable in the first place.)

Since keys will be evaluated progressively, each successive key function will have access to any previous ones. These keys can also override existing variables.

### TypeScript-first dynamic processing

You can write your dynamic module in TypeScript and point `dynamicPath` at a `.ts` file. Install [`esbuild`](https://esbuild.github.io/) as a dev dependency to enable automatic compilation:

```ts
// dynamic.ts
export default {
  MY_DYNAMIC: ({ APP_SETTING = '' }) => `${APP_SETTING}-ts`,
};
```

If `esbuild` is not installed and a direct import fails, get-dotenv attempts a simple fallback for single-file `.ts` modules without imports; otherwise it will throw with clear guidance to install `esbuild`.

Programmatic users can skip files entirely and pass dynamic variables directly:

```ts
import { getDotenv, defineDynamic } from '@karmaniverous/get-dotenv';

const dynamic = defineDynamic({
  MY_DYNAMIC(vars, env) {
    return `${vars.APP_SETTING}-${env ?? ''}`;
  },
});

const vars = await getDotenv({ dynamic, paths: ['./'], env: 'dev' });
```

Notes:

- Programmatic `dynamic` takes precedence over `dynamicPath` when both are provided.
- Dynamic keys are evaluated progressively, so later keys can reference earlier results.

#### Troubleshooting

- “Unknown file extension '.ts'” when loading `dynamic.ts`:
  - Install `esbuild` (`npm i -D esbuild`).

- “Unable to load dynamic TypeScript file …”:
  - Install `esbuild`. A simple transpile fallback exists only for trivial single-file modules; any imports in `dynamic.ts` require `esbuild` bundling.

## Command Line Interface

You can also use `getdotenv` from the command line:

```bash
> npx getdotenv -h

# Usage: getdotenv [options] [command]
#
# Base CLI.
#
# Options:
#   -e, --env <string>                  target environment (dotenv-expanded)
#   -v, --vars <string>                 extra variables expressed as delimited key-value pairs (dotenv-expanded): KEY1=VAL1 KEY2=VAL2
#   -o, --output-path <string>          consolidated output file  (dotenv-expanded)
#   -s, --shell [string]                command execution shell, no argument for default OS shell or provide shell string (default OS shell)
#   -S, --shell-off                     command execution shell OFF
#   -p, --load-process                  load variables to process.env ON (default)
#   -P, --load-process-off              load variables to process.env OFF
#   -a, --exclude-all                   exclude all dotenv variables from loading ON
#   -A, --exclude-all-off               exclude all dotenv variables from loading OFF (default)
#   -z, --exclude-dynamic               exclude dynamic dotenv variables from loading ON
#   -Z, --exclude-dynamic-off           exclude dynamic dotenv variables from loading OFF (default)
#   -n, --exclude-env                   exclude environment-specific dotenv variables from loading
#   -N, --exclude-env-off               exclude environment-specific dotenv variables from loading OFF (default)
#   -g, --exclude-global                exclude global dotenv variables from loading ON
#   -G, --exclude-global-off            exclude global dotenv variables from loading OFF (default)
#   -r, --exclude-private               exclude private dotenv variables from loading ON
#   -R, --exclude-private-off           exclude private dotenv variables from loading OFF (default)
#   -u, --exclude-public                exclude public dotenv variables from loading ON
#   -U, --exclude-public-off            exclude public dotenv variables from loading OFF (default)
#   -l, --log                           console log loaded variables ON
#   -L, --log-off                       console log loaded variables OFF (default)
#   -d, --debug                         debug mode ON
#   -D, --debug-off                     debug mode OFF (default)
#   --default-env <string>              default target environment
#   --dotenv-token <string>             dotenv-expanded token indicating a dotenv file (default: ".env")
#   --dynamic-path <string>             dynamic variables path (.js or .ts; .ts is auto-compiled when esbuild is available, otherwise precompile)
#   --paths <string>                    dotenv-expanded delimited list of paths to dotenv directory (default: "./")
#   --paths-delimiter <string>          paths delimiter string (default: " ")
#   --paths-delimiter-pattern <string>  paths delimiter regex pattern
#   --private-token <string>            dotenv-expanded token indicating private variables (default: "local")
#   --vars-delimiter <string>           vars delimiter string (default: " ")
#   --vars-delimiter-pattern <string>   vars delimiter regex pattern
#   --vars-assignor <string>            vars assignment operator string (default: "=")
#   --vars-assignor-pattern <string>    vars assignment operator regex pattern
#   -h, --help                          display help for command
#
# Commands:
#   batch [options]                     Batch shell commands across multiple working directories.
#   cmd                                 Batch execute command according to the --shell option, conflicts with --command option (default command)
#   help [command]                      display help for command
```

### Default shell behavior

To normalize behavior across platforms, the CLI resolves a default shell when `--shell` is true or omitted:

- POSIX: `/bin/bash`
- Windows: `powershell.exe`

### Batch Command

The `getdotenv` base CLI includes one very useful subcommand: `batch`.

This command lets you execute a shell command across multiple working directories. Executions occur within the loaded `dotenv` context. Might not be relevant to your specific use case, but when you need it, it's a game-changer!

My most common use case for this command is a microservice project where release day finds me updating dependencies & performing a release in well over a dozen very similar repositories. The sequence of steps in each case is exactly the same, but I need to respond individually as issues arise, so scripting the whole thing out would fail more often than it would work.

I use the `batch` command to perform each step across all repositories at once. Once you get used to it, it feels like a superpower!

Lest you doubt what that kind of leverage can do for you, consider this:

[![batch superpower in action](./assets/contributions.png)](https://github.com/karmaniverous)

```bash
> getdotenv batch -h

# Usage: getdotenv batch [options] [command]
#
# Batch command execution across multiple working directories.
#
# Options:
#   -p, --pkg-cwd             use nearest package directory as current working directory
#   -r, --root-path <string>  path to batch root directory from current working directory (default: "./")
#   -g, --globs <string>      space-delimited globs from root path (default: "*")
#   -c, --command <string>    command executed according to the base --shell option, conflicts with cmd subcommand (dotenv-expanded)
#   -l, --list                list working directories without executing command
#   -e, --ignore-errors       ignore errors and continue with next path
#   -h, --help                display help for command
#
# Commands:
#   cmd                       execute command, conflicts with --command option (default subcommand)
#   help [command]            display help for command
```

Note that `batch` executes its commands in sequence, rather than in parallel!

To understand why, imagine running `npm install` in a dozen repos from the same command line. The visual feedback would be impossible to follow, and if something broke you'd have a really hard time figuring out why.

Instead, everything runs in sequence, and you get a clear record of exactly what happened and where. Also worth noting that many complex processes are resource hogs: you would not _want_ to run a dozen Serverless deployments at once!

Meanwhile, [this issue](https://github.com/karmaniverous/get-dotenv/issues/7) documents the parallel-processing option requirement. Feel free to submit a PR!

---

### Authoring npm scripts and the `-c`/`--cmd` alias

When you run commands via `npm run`, flags after `--` are forwarded to your script and may be applied to the inner shell command instead of `getdotenv` unless you structure your script carefully.

- Anti-pattern:

  ```json
  { "scripts": { "script": "getdotenv echo $APP_SETTING" } }
  ```

  Then `npm run script -- -e dev` applies `-e` to `echo`, not to `getdotenv`.

- Recommended:
  ```json
  { "scripts": { "script": "getdotenv -c 'echo $APP_SETTING'" } }
  ```
  Now `npm run script -- -e dev` applies `-e` to `getdotenv`, which loads and expands variables before executing the inner command.

Notes:

- `-c`/`--cmd` is an alias of the `cmd` subcommand; do not use both in a single invocation.
- On POSIX shells, prefer single quotes to prevent the outer shell from expanding `$VAR` before Node sees it. On PowerShell, single quotes are also literal.
- Script-level shell overrides (`scripts[name].shell`) still take precedence over the global `--shell`.

Important:

- When using the parent alias `--cmd` with a Node eval payload, quote the entire payload as a single token so Commander does not treat `-e/--eval` as getdotenv’s `-e, --env` flag.
  - POSIX example:
    ```
    getdotenv --cmd 'node -e "console.log(process.env.APP_SETTING ?? \"\")"'
    ```
  - PowerShell example (single quotes are literal in PowerShell):
    ```
    getdotenv --cmd 'node -e "console.log(process.env.APP_SETTING ?? \"\")"'
    ```
- If you do not need to pass additional parent flags after the command, you can prefer the subcommand form instead:
  ```
  getdotenv --shell-off cmd node -e "console.log(process.env.APP_SETTING ?? '')"
  ```

Diagnostics and CI capture:

- To capture child stdout/stderr deterministically (e.g., in CI), either set the environment variable `GETDOTENV_STDIO=pipe` or pass `--capture`. Outputs are buffered and re-emitted after completion.
- For debugging environment composition, use:
  ```
  getdotenv --trace [keys...] cmd node -e "0"
  ```
  When provided without keys, `--trace` emits a concise origin line for every key (parent | dotenv | unset) to stderr before the child process launches.

---

## Guides

- [Cascade and precedence](./guides/cascade.md)
- [Shell execution behavior and quoting](./guides/shell.md)
- [Config files and overlays](./guides/config.md)
- [Plugin-first host and plugins](./guides/plugins.md)

The guides are also included in the [hosted API docs](https://docs.karmanivero.us/get-dotenv).

## Generated CLI

This package still supports generating a standalone CLI for your projects. For most use cases we recommend the new plugin-first host because it resolves dotenv context once per invocation, supports composable plugins, and provides better subprocess control and diagnostics. If you prefer a thin, fixed command surface with defaults baked into config, the generated CLI can be a good fit.

See the [Generated CLI guide](https://docs.karmanivero.us/get-dotenv/guides/generated-cli) for details

---

See more great templates & tools on [my GitHub Profile](https://github.com/karmaniverous)!
````

### Full Listing: guides/plugins.md

````markdown
---
title: Plugin-first host
sidebar_position: 1
---

# Plugin-first host (GetDotenvCli)

The plugin-first host provides a composable way to build dotenv-aware CLIs. It validates options strictly, resolves dotenv context once per invocation, and exposes lifecycle hooks for plugins.

## Quickstart

```ts
#!/usr/bin/env node
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';

const program: Command = new GetDotenvCli('mycli').use(batchPlugin());
await (program as unknown as GetDotenvCli).resolveAndLoad();
await program.parseAsync();
```

- `resolveAndLoad()` produces a context `{ optionsResolved, dotenv, plugins? }`.
- The host registers a preSubcommand hook to ensure a context exists when subcommands run (e.g., batch).

## Wiring included plugins (cmd, batch, aws, init)

This library ships a small set of ready‑to‑use plugins. Most projects want the same baseline:

- Root flags (`-e/--env`, `--paths`, `--dotenv-token`, `--strict`, `--trace`, etc.)
- A “cmd” command (and parent alias `-c, --cmd <command...>`) for one‑off commands
- The “batch” command for running a command across many working directories
- The AWS base plugin to establish a session and make it available to children
- The “init” plugin for scaffolding config and a CLI skeleton

Here is a minimal host that wires all of the above.

```ts
#!/usr/bin/env node
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { cmdPlugin } from '@karmaniverous/get-dotenv/plugins/cmd';
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins/aws';
import { initPlugin } from '@karmaniverous/get-dotenv/plugins/init';

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

Notes:

- attachRootOptions adds the familiar root flags so users can select env, set paths, enable `--strict`, `--trace`, etc.
- passOptions composes defaults + flags into a merged options bag, resolves the dotenv context once, and persists the merged bag for nested invocations. Included plugins (cmd/batch/aws) read this bag for consistent behavior (shell resolution, scripts, capture).
- cmdPlugin installs both the subcommand and a parent alias `-c, --cmd <command...>`. Prefer the alias in npm scripts so flags after `--` are applied to your CLI, not to the inner command.

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
````

---

SMOZ interop response (export surface and runtime behavior)

- Canonical entry (named): We expose a stable named factory `createCli(opts?) => { run(argv: string[]): Promise<void> }` from the top-level module. This covers the recommended contract in your interop note and is the path used by our own binary (`dist/getdotenv.cli.mjs`) and by downstream embedders.
- Deterministic help across ESM/CJS: `createCli().run(['-h'])` short-circuits before parsing to avoid Commander’s default `process.exit`. This applies in both ESM and CJS and eliminates environment-sensitive behavior in tests and programmatic embeddings. Consequence: the optional help header set by `brand()` may be omitted in the `-h/--help` path; the header still appears in flows that run through branding (e.g., `getdotenv help` or hosts that call `brand()` before `parseAsync()`).
- ESM/CJS matrix covered by tests:
  - ESM dynamic: `(await import('../index')).createCli().run(['-h'])` (smoke test).
  - CJS require: `require('dist/index.cjs').createCli().run(['-h'])` (smoke test; gated to run when dist is present).
- Default export variants: we did not add a default export (callable or object) in this release. The canonical surface is the named `createCli`. Your downstream adapter can continue to probe legacy shapes if desired, but the recommended path going forward is the named factory.
- Types/public surface: `createCli` is included in the published `.d.ts` and in the top-level `exports` map (ESM/CJS). If you add a type-level probe in your interop matrix (optional), it should pass against `dist/index.d.*`.
- Docs alignment:
  - README and Guides now clarify the `-h/--help` short-circuit and its interaction with branding.
  - Embedding examples include both ESM dynamic import and CJS require (against dist), matching your adapter’s use cases.

If you want us to add a transitional default export shim (`default.createCli` or a callable default delegating to `createCli(opts).run(argv)`), we can schedule that in a minor release; for now, the canonical contract is the named `createCli`, and our tests validate that path in both module systems.
