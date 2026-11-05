import type { PgBoss } from "pg-boss";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { env } from "../../env.ts";
import { startBoss } from "../../jobs/boss.ts";
import { logger } from "../../lib/logger.ts";
import { textEvent } from "./line-webhook.fixtures.ts";
import {
  enqueueLineEvent,
  registerLineEventWorker,
} from "./line-webhook.jobs.ts";
import type { LineReplyClient } from "./line-webhook.service.ts";

let boss: PgBoss;

beforeAll(async () => {
  boss = await startBoss(env.DATABASE_URL);
});

beforeEach(async () => {
  await boss.deleteAllJobs();
});

afterAll(async () => {
  await boss.stop();
});

test("logs a failed reply with its webhook event id", async () => {
  const logError = vi.spyOn(logger, "error");
  const line: LineReplyClient = {
    replyMessage: () => Promise.reject(new Error("LINE rejected the reply")),
  };
  const workerId = await registerLineEventWorker(boss, line);

  await enqueueLineEvent(boss, textEvent("E-fail"));
  boss.notifyWorker(workerId);

  await vi.waitFor(
    () => {
      expect(logError).toHaveBeenCalledWith(
        expect.objectContaining({ webhookEventId: "E-fail" }),
        "line event failed",
      );
    },
    { timeout: 5000 },
  );
});
