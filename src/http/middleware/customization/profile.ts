/**
 * HTTP profile selection.
 *
 * Kept free of runtime imports (no Middy) so the registry can validate a
 * function's profile at definition time without loading the HTTP stack.
 */
import type { AppHttpConfig, FunctionHttpConfig, HttpProfile } from './types';

/**
 * The profile a function uses: its own `http.profile`, else
 * `functionDefaults.http.profile`.
 *
 * @param args - function name (for the error), app config, the app-wide
 *   function default and the function's own config
 * @returns the selected profile, or undefined when none is selected
 * @throws Error when the selected name isn't a key of `app.profiles`, naming
 *   the profile, where it was set and the known profiles
 */
export const selectHttpProfile = (args: {
  functionName: string;
  app?: AppHttpConfig | undefined;
  fnDefaults?: FunctionHttpConfig | undefined;
  fn?: FunctionHttpConfig | undefined;
}): HttpProfile | undefined => {
  const { functionName, app, fnDefaults, fn } = args;
  const name = fn?.profile ?? fnDefaults?.profile;
  if (name === undefined) return undefined;
  const profiles = app?.profiles ?? {};
  if (Object.hasOwn(profiles, name)) return profiles[name];
  const source =
    fn?.profile !== undefined
      ? 'http.profile'
      : 'functionDefaults.http.profile';
  const known = Object.keys(profiles);
  throw new Error(
    `Unknown HTTP profile "${name}" (${source}) on function '${functionName}'. ` +
      `Known profiles: ${known.length ? known.join(', ') : '(none)'}. ` +
      'Define it in App.create({ http: { profiles } }) or fix the name.',
  );
};
