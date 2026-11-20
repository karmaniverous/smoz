import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Show a test's console output only when it fails.
    silent: 'passed-only',
    environment: 'node',
    // Avoid picking up transformed caches and keep node_modules excluded
    exclude: [
      ...configDefaults.exclude,
      '**/.tsbuild/**',
      '**/.rollup.cache/**',
    ],
  },
});
