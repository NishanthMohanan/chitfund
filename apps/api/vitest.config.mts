import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // Nest dependency injection needs emitted decorator metadata, which esbuild does not produce.
    swc.vite({ module: { type: 'es6' } }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.e2e.test.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 15_000,
    fileParallelism: false,
  },
});
