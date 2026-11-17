import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests share one real database: run files sequentially.
    fileParallelism: false,
    globalSetup: ['./test/global-setup.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
