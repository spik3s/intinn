import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Db } from "../db/client.ts";
import { logger } from "../lib/logger.ts";

export interface AppDeps {
  db: Db;
}

export function createApp({ db }: AppDeps): Hono {
  const app = new Hono();

  app.get("/health", async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ status: "ok" });
    } catch (err) {
      logger.warn({ err }, "health check failed");
      return c.json({ status: "unavailable" }, 503);
    }
  });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    logger.error({ err }, "unhandled error");
    return c.json({ status: "error" }, 500);
  });

  return app;
}
