import { PgBoss } from "pg-boss";
import { logger } from "../lib/logger.ts";
import { queues } from "./queues.ts";

export async function startBoss(connectionString: string): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);
  boss.on("error", (err) => {
    logger.error({ err }, "pg-boss error");
  });
  await boss.start();
  for (const name of Object.values(queues)) {
    await boss.createQueue(name);
  }
  return boss;
}
