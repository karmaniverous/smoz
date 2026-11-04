/* REQUIREMENTS ADDRESSED
 * - Provide a lightweight Serverless Framework plugin that ensures registers are fresh
 *   by running `smoz register` before package/deploy.
 * - Keep it simple: spawn Node to run the packaged CJS CLI, inherit stdio, and fail fast.
 *
 * Notes:
 * - This file is bundled to dist/cjs/serverless-plugin.js and exported via the "./serverless-plugin" subpath.
 * - Serverless v4 loads CJS plugins via `require`; exporting a default class allows
 *   rollup to wrap it for CJS while preserving the ESM entry for completeness.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const runRegister = (): void => {
  // Resolve the packaged CLI entry relative to the compiled CJS plugin:
  // dist/cjs/serverless-plugin.js -> ../cli/index.cjs
  const cliPath = path.resolve(__dirname, '../cli/index.cjs');
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
// Serverless constructs plugins with (serverless, options); this plugin needs
// neither, so the constructor takes no parameters.
export default class SmozRegisterPlugin {
  hooks: Record<string, () => void> = {
    // Package lifecycle
    'before:package:initialize': runRegister,
    // Deploy lifecycles where functions/artifacts can be (re)built
    'before:deploy:function:initialize': runRegister,
    'before:deploy:deploy': runRegister,
  };
}
