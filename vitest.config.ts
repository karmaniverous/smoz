import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    // Avoid picking up transformed caches and keep node_modules excluded
    exclude: [
      ...configDefaults.exclude,
      '**/.tsbuild/**',
      '**/.rollup.cache/**',
    ],
  },
});
