# Interop — get-dotenv: Lazy Option Descriptions via Callback

## Summary
Allow `.option()` descriptions to be functions. This enables plugins to generate dynamic help text (e.g., "ON (default)") based on the resolved configuration (`cliDefaults`), which is not available during the initial `setup()` phase.

## Motivation
Plugins often want to reflect user configuration in CLI help text. For example, if a user sets `"dev": { "register": false }` in their config, the CLI help should show:

```text
  -r, --register      run register step ON
  -R, --no-register   run register step OFF (default)
```

Currently, `setup(cli)` runs before config resolution, forcing plugins to use static strings.

## Proposed API
Extend the `Command.option` signature in the `GetDotenvCli` wrapper:

```typescript
type DescriptionFn = (context: { config: Record<string, unknown>; env: NodeJS.ProcessEnv }) => string;

// In plugin setup:
cli.command('dev')
  .option('-r, --register', (ctx) => `run register step ON${ ctx.config.dev?.register ? ' (default)' : '' }`)
```

## Host Behavior
1.  **Storage**: The host stores the callback instead of a string.
2.  **Resolution**: After `get-dotenv` resolves the configuration (merging files, env, etc.), but *before* invoking the command action or displaying help.
3.  **Execution**: The host iterates over registered options, executes the callbacks with the resolved context, and updates the underlying Commander option descriptions.

## Acceptance Criteria
-   Plugins can pass a function as the second argument to `.option()`.
-   The function receives the fully resolved configuration object.
-   `--help` output reflects the dynamic strings returned by the function.
