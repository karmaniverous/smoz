/**
 * SMOZ command plugin (skeleton)
 *
 * Intent:
 * - Register smoz commands (init/add/register/openapi/dev) on a get-dotenv host.
 * - Commands will delegate to existing implementations (runInit/runAdd/runRegister/runOpenapi/runDev).
 *
 * Notes:
 * - This is a placeholder to be wired in a subsequent change when the host
 *   composition is finalized. We avoid coupling to an untyped plugin API here.
 * - Do not import or execute side effects at module load. Keep registration
 *   pure to minimize surprises across environments.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HostLike = Record<string, any>;

/**
 * Attach SMOZ commands to a host (no-op placeholder).
 *
 * @param _host - get-dotenv host instance (when available)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const attachSmozCommands = (_host: HostLike): void => {
  // Placeholder: the real implementation will:
  // - define init/add/register/openapi/dev commands with flags
  // - delegate each command to the corresponding run* function
  // - respect stage precedence and spawn-env normalization
};

export default attachSmozCommands;
