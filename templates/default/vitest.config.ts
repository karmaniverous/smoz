import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.tsbuild/**'],
    // Show a test's console output only when it fails.
    silent: 'passed-only',
  },
});
