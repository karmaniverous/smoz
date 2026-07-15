/**
 * Inline HTTP dev server (module entry).
 *
 * Decomposed from the original single-file implementation to improve
 * readability and maintainability:
 * - loaders.ts: register/app loaders
 * - routes.ts: route table construction
 * - http.ts: request/event mapping helpers
 */
import http from 'node:http';
import { URL } from 'node:url';

import { match, toEvent, writeResult } from './http';
import { type AppLike, loadApp, loadRegisters } from './loaders';
import { loadHandlers, type Route } from './routes';

const start = async (): Promise<void> => {
  const root = process.cwd();
  // Ensure register side-effects are loaded so the registry has routes
  await loadRegisters(root);
  // Load the App instance from the same TS source as the registers
  const app: AppLike = await loadApp(root);
  const routes: Route[] = await loadHandlers(root, app);

  const portEnv = process.env.SMOZ_PORT;
  const port =
    typeof portEnv === 'string' && portEnv.length > 0 ? Number(portEnv) : 0;

  const server = http.createServer((req, res) => {
    void (async () => {
      try {
        const method = (req.method ?? '').toUpperCase();
        const url = new URL(
          req.url ?? '/',
          `http://${req.headers.host ?? 'localhost'}`,
        );
        // Allow HEAD to match GET routes; the wrapped handler/middleware will
        // short-circuit HEAD requests to 200 {} and set Content-Type.
        const searchMethod = method === 'HEAD' ? 'GET' : method;
        const route = routes.find(
          (r) => r.method === searchMethod && match(r.segs, url.pathname).ok,
        );
        if (!route) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Not Found' }));
          return;
        }
        const { params } = match(route.segs, url.pathname);
        const evt = await toEvent(req, route, params);
        const result = await route.handler(evt, {
          awsRequestId: String(Date.now()),
          callbackWaitsForEmptyEventLoop: false,
          functionName: 'inline',
          functionVersion: '$LATEST',
          invokedFunctionArn: 'arn:inline',
          logGroupName: 'lg',
          logStreamName: 'ls',
          memoryLimitInMB: '256',
          getRemainingTimeInMillis: () => 30000,
          done: () => undefined,
          fail: () => undefined,
          succeed: () => undefined,
        });
        writeResult(res, result);
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
    })();
  });

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
  });
};

// Start immediately when run via tsx
void start();
