import base from "./vitest.config.mts";

/**
 * The suite with React's scheduler made late (tests/lateScheduler.setup.ts),
 * which must load before tests/setup.ts imports React.
 */
const config = base as { test: { setupFiles: string[]; testTimeout?: number } };
config.test.setupFiles = ["tests/lateScheduler.setup.ts", ...config.test.setupFiles];
config.test.testTimeout = 20_000;

export default config;
