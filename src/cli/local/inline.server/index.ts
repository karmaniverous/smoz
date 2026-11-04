/**
 * Inline HTTP dev server (module entry).
 *
 * Decomposed from the original single-file implementation to improve
 * readability and maintainability:
 * - loaders.ts: register/app/binaryMediaTypes loaders
 * - routes.ts: route table construction
 * - listener.ts: request routing and handler invocation
 * - http.ts: request/event mapping helpers
 * - binaryMediaTypes.ts: API Gateway binary body encoding rules
 */
import http from 'node:http';

import { createListener } from './listener';
import {
  type AppLike,
  loadApp,
  loadBinaryMediaTypes,
  loadRegisters,
} from './loaders';
import { loadHandlers, type Route } from './routes';

const start = async (): Promise<void> => {
  const root = process.cwd();
  // Ensure register side-effects are loaded so the registry has routes
  await loadRegisters(root);
  // Load the App instance from the same TS source as the registers
  const app: AppLike = await loadApp(root);
  const routes: Route[] = await loadHandlers(root, app);
  // Encode request bodies as the deployed API Gateway would.
  const binary = await loadBinaryMediaTypes(root);

  const portEnv = process.env.SMOZ_PORT;
  const port =
    typeof portEnv === 'string' && portEnv.length > 0 ? Number(portEnv) : 0;

  const server = http.createServer(createListener(routes, binary.types));

  server.listen(port, () => {
    const addr = server.address();
    const resolved =
      typeof addr === 'object' && addr && 'port' in addr
        ? (addr as { port: number }).port
        : port;

    // Print route table
    // Keep output consistent with existing tests:
    // "[inline] listening on http://localhost:<port>"
    console.log('[inline] listening on http://localhost:' + String(resolved));
    const header = '[inline] routes:\n';
    if (routes.length === 0) {
      console.log(header + '  (none found)');
    } else {
      const body = routes
        .map(
          (r) =>
            '  ' +
            r.method.padEnd(6) +
            ' ' +
            r.pattern +
            '  ->  ' +
            r.handlerRef,
        )
        .join('\n');
      console.log(header + body);
    }
    console.log(
      '[inline] binaryMediaTypes: ' +
        (binary.types.length > 0 ? binary.types.join(', ') : '(none)') +
        ' from ' +
        binary.source,
    );
  });
};

// Start immediately when run via tsx
void start();
