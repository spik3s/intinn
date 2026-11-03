import { expect, test } from 'vitest';
import { parseEnv } from './env.ts';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  LINE_CHANNEL_SECRET: 's',
  LINE_CHANNEL_ACCESS_TOKEN: 't',
};

test('applies defaults for optional settings', () => {
  expect(parseEnv(valid)).toMatchObject({
    NODE_ENV: 'development',
    PORT: 3000,
    LOG_LEVEL: 'info',
  });
});

test('reads PORT as a number', () => {
  expect(parseEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
});

test('names every missing required setting', () => {
  expect(() => parseEnv({})).toThrow(
    /DATABASE_URL[\s\S]*LINE_CHANNEL_SECRET[\s\S]*LINE_CHANNEL_ACCESS_TOKEN/,
  );
});
