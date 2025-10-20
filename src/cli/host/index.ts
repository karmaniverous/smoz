/**
 * get-dotenv host wrapper (skeleton)
 *
 * Responsibilities:
 * - Provide a simple facade that invokes the get-dotenv host with branding.
 * - Keep all probing/shape handling inside the existing adapter until we
 *   fully wire plugin registration APIs here.
 *
 * Notes:
 * - This module is intentionally minimal for the initial landing. The CLI
 *   entry opts in via SMOZ_HOST=1 and falls back to current behavior by default.
 * - Future iterations will construct the host (createCli) and install the
 *   smoz command plugin alongside the AWS base, cmd, and batch plugins.
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
