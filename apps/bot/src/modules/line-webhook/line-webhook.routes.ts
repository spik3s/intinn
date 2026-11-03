import { validateSignature, type webhook } from "@line/bot-sdk";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { PgBoss } from "pg-boss";
import { env } from "../../env.ts";
import { enqueueLineEvent } from "./line-webhook.jobs.ts";

export function lineWebhookRoutes({ boss }: { boss: PgBoss }): Hono {
  return new Hono().post("/", async (c) => {
    const body = await c.req.text();
    const signature = c.req.header("x-line-signature");
    if (
      signature === undefined ||
      !validateSignature(body, env.LINE_CHANNEL_SECRET, signature)
    ) {
      throw new HTTPException(401);
    }

    const { events } = JSON.parse(body) as webhook.CallbackRequest;
    for (const event of events) {
      await enqueueLineEvent(boss, event);
    }
    return c.body(null, 200);
  });
}
