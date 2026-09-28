import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Single-threaded: mongodb-memory-server spins up one mongod and a single
    // global setup file drives it, so running test files concurrently would
    // mean several databases fighting over the same connection state.
    // The suite completes in a few seconds, so correctness beats parallelism.
    fileParallelism: false,
    maxWorkers: 1,
    setupFiles: ['./tests/setup.js'],
    environment: 'node',
    testTimeout: 20_000,
    // The very first run downloads the mongod binary, which can take a while.
    hookTimeout: 180_000,
    reporters: 'verbose',
  },
});
