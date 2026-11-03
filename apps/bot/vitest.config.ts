import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgres://intinn:intinn@localhost:5432/intinn_test',
      LINE_CHANNEL_SECRET: 'test-channel-secret',
      LINE_CHANNEL_ACCESS_TOKEN: 'test-access-token',
    },
  },
});
