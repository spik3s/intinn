import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test files share one database and its pg-boss queues; in parallel they consume each other's jobs.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: "postgres://intinn:intinn@localhost:5432/intinn_test",
      LINE_CHANNEL_SECRET: "test-channel-secret",
      LINE_CHANNEL_ACCESS_TOKEN: "test-access-token",
    },
  },
});
