/**
 * get-dotenv host wrapper (skeleton)
 *
 * Responsibilities:
 * - Provide a simple facade that invokes the get-dotenv host with branding.
 * - Prefer a real host (createCli) when available so we can attach the SMOZ
 *   plugin. Fall back to the safe adapter otherwise.
 *
 * Notes:
 * - This module is intentionally minimal for the initial landing. The CLI
 *   entry opts in via SMOZ_HOST=1 and falls back to current behavior by default.
 * - Future iterations will install AWS base, cmd, and batch plugins alongside
 *   the SMOZ command plugin (init/add/register/openapi/dev).
 */
import { attachSmozCommands } from '@/src/cli/plugins/smoz';
import { runGetDotenvHost } from '@/src/cli/util/getdotenvHost';
void attachSmozCommands; // keep plugin visible to tooling until registration is wired

/**
 * Attempt to run all CLI argv via the get-dotenv host.
 *
 * @param argv - process argv slice (after bin)
 * @param branding - e.g., "smoz vX.Y.Z"
 * @returns true when the host path was invoked (regardless of outcome);
 *          false when the host path was not attempted.
 */
export const runWithHost = async (
  argv: string[],
  branding: string,
): Promise<boolean> => {
  try {
    // Prefer a real host (createCli) when available
    const mod = (await import('@karmaniverous/get-dotenv')) as Record<
      string,
      unknown
    >;
    if (typeof (mod as { createCli?: unknown }).createCli === 'function') {
      const factory = mod as unknown as {
        createCli: (opts: { branding?: string }) => {
          run: (a: string[]) => Promise<void>;
          // Future: host.use(plugin) or similar, if provided.
        };
      };
      const host =
        typeof branding === 'string'
          ? factory.createCli({ branding })
          : factory.createCli({});
      // Attach the (currently no-op) SMOZ commands; this will register
      // init/add/register/openapi/dev in a follow-up when the plugin API is wired.
      try {
        attachSmozCommands(host as unknown as Record<string, unknown>);
      } catch {
        /* no-op — keep host usable even if attachment fails */
      }
      await host.run(argv);
      return true;
    }
    // Fallback path — invoke the safe adapter that probes multiple entry shapes.
    await runGetDotenvHost(argv, branding);
    return true;
  } catch (e) {
    // Best-effort: signal that we attempted the host path; callers may choose
    // to fall back to legacy command mapping on failure.
    const msg = (e as Error).message;
    // Keep stderr concise; callers print their own diagnostics.

    console.error(`[host] ${msg}`);
    return true;
  }
};
