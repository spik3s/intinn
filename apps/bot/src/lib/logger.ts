import { pino } from "pino";
import { env } from "../env.ts";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    "headers.authorization",
    'headers["x-line-signature"]',
    "*.channelAccessToken",
    "*.replyToken",
  ],
});
