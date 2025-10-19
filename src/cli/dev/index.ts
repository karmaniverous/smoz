import path from 'node:path';

import chokidar from 'chokidar';

import { launchOffline, type OfflineRunner } from '../local/offline';
import { runOpenapi } from '../openapi';
import { runRegister } from '../register';
import { resolveStage, seedEnvForStage } from './env';
import { launchInline } from './inline';
export { resolveTsxCommand } from './inline';

export type LocalMode = false | 'inline' | 'offline';

export const runDev = async (
  root: string,
  opts: {
    register: boolean;
    openapi: boolean;
    local: LocalMode;
    stage?: string;
    port?: number;
    verbose?: boolean;
  },
): Promise<void> => {
  const verbose = !!opts.verbose;
  const stage = await resolveStage(
    root,
    typeof opts.stage === 'string' ? opts.stage : undefined,
    verbose,
  );
  // Seed env with concrete values for the selected stage.
  try {
    await seedEnvForStage(root, stage, verbose);
  } catch (e) {
    if (verbose)
      console.warn('[dev] env seeding warning:', (e as Error).message);
  }
  const modeInitial: LocalMode = opts.local;
  const mode: LocalMode = modeInitial;
  const port = typeof opts.port === 'number' ? opts.port : 0;

  if (verbose) {
    console.log(
      `[dev] options: register=${String(opts.register)} ` +
        `openapi=${String(opts.openapi)} ` +
        `local=${String(mode)} ` +
        `stage=${stage} ` +
        `port=${String(port)}`,
    );
  }

  // Single debounced queue
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;
  // Small executor we can use for both pre-flight and queued runs
  const executeOnce = async (): Promise<{
    wrote: boolean;
    openapiChanged: boolean;
  }> => {
    if (running) return { wrote: false, openapiChanged: false };
    running = true;
    pending = false;
    try {
      let wrote = false;
      if (opts.register) {
        const res = await runRegister(root);
        wrote = res.wrote.length > 0;
        console.log(
          res.wrote.length
            ? `Updated:\n - ${res.wrote.join('\n - ')}`
            : 'No changes.',
        );
      }
      let openapiChanged = false;
      if (opts.openapi) {
        openapiChanged = await runOpenapi(root, { verbose });
      }
      return { wrote, openapiChanged };
    } catch (e) {
      console.error('[dev] task error:', (e as Error).message);
      return { wrote: false, openapiChanged: false };
    } finally {
      running = false;
      // If a burst arrived while we were running, schedule again
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (pending) schedule();
    }
  };
  // Local child (if any)
  let offline: OfflineRunner | undefined;
  let inlineChild: Awaited<ReturnType<typeof launchInline>> | undefined;

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void (async () => {
        pending = false;
        const { wrote, openapiChanged } = await executeOnce();
        // Local backend refresh
        if (mode === 'offline') {
          // Restart only when route-surface can change (register wrote)
          if (wrote && offline) {
            if (verbose)
              console.log(
                '[dev] restarting serverless-offline (register changed)...',
              );
            await offline.restart();
          }
        } else if (mode === 'inline') {
          // Restart inline only if something material changed
          if (wrote || openapiChanged) {
            if (verbose) console.log('[dev] restarting inline server...');
            // inlineChild is created when mode === 'inline'; guard for safety
            if (inlineChild) {
              await inlineChild.restart();
            }
          }
        }
      })();
    }, 250);
  };
  // Pre-flight: run tasks before launching the local backend to avoid an immediate restart
  await executeOnce();

  // Local serving
  if (mode === 'offline') {
    offline = await launchOffline(root, { stage, port, verbose });
  } else if (mode === 'inline') {
    // Hard error on failure; no fallback to offline.
    inlineChild = await launchInline(root, { stage, port, verbose });
  }

  // Watch sources
  const globs = [
    path.join(root, 'app', 'functions', '**', 'lambda.ts'),
    path.join(root, 'app', 'functions', '**', 'openapi.ts'),
    path.join(root, 'app', 'functions', '**', 'serverless.ts'),
  ];
  if (verbose)
    console.log(
      '[dev] watching:',
      globs.map((g) => path.posix.normalize(g)).join(', '),
    );
  const watcher = chokidar.watch(globs, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });
  watcher.on('add', schedule).on('change', schedule).on('unlink', schedule);

  // Keep process alive until SIGINT
  await new Promise<void>((resolve) => {
    const stop = async () => {
      try {
        await watcher.close();
        await offline?.close();
        await inlineChild?.close();
      } finally {
        resolve();
      }
    };
    process.on('SIGINT', () => {
      void stop();
    });
    process.on('SIGTERM', () => {
      void stop();
    });
  });
};
