/* REQUIREMENTS ADDRESSED
 * - Provide a lightweight Serverless Framework plugin that ensures registers are fresh
 *   by running `smoz register` before package/deploy.
 * - Keep it simple: spawn Node to run the packaged ESM CLI bin, inherit stdio, and fail fast.
 *
 * Notes:
 * - This file is bundled to dist/serverless-plugin.js and exported via the "./serverless-plugin" subpath.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runRegister = (): void => {
  // Resolve the packaged CLI bin relative to this compiled module:
  // dist/serverless-plugin.js -> dist/bin/smoz.js
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cliPath = path.resolve(here, 'bin', 'smoz.js');
  const res = spawnSync(process.execPath, [cliPath, 'register'], {
    stdio: 'inherit',
    shell: false,
  });
  const code: string =
    typeof res.status === 'number' ? String(res.status) : 'unknown';
  if (res.status !== 0)
    throw new Error(`smoz register failed (exit code ${code})`);
};

// Minimal Serverless v4 plugin: register hooks that run before package/deploy.
/**
 * Serverless Framework plugin to ensure registers are fresh.
 */
export default class SmozRegisterPlugin {
  /** Serverless hooks. */
  hooks: Record<string, () => void>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_serverless?: any, _options?: any) {
    void _serverless;
    void _options;
    this.hooks = {
      // Package lifecycle
      'before:package:initialize': runRegister,
      // Deploy lifecycles where functions/artifacts can be (re)built
      'before:deploy:function:initialize': runRegister,
      'before:deploy:deploy': runRegister,
    };
  }
}
