import { serve } from "@hono/node-server";
import { messagingApi } from "@line/bot-sdk";
import { createDb } from "./db/client.ts";
import { env } from "./env.ts";
import { createApp } from "./http/app.ts";
import { startBoss } from "./jobs/boss.ts";
import { logger } from "./lib/logger.ts";
import { registerLineEventWorker } from "./modules/line-webhook/index.ts";

const db = createDb(env.DATABASE_URL);
const boss = await startBoss(env.DATABASE_URL);
const line = new messagingApi.MessagingApiClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});
await registerLineEventWorker(boss, line);

const server = serve({ fetch: createApp({ db, boss }).fetch, port: env.PORT });
logger.info({ port: env.PORT }, "listening");

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "shutting down");
  server.close();
  await boss.stop();
  await db.$client.end();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void shutdown(signal));
}
