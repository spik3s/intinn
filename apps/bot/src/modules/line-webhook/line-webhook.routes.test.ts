import { createHmac } from "node:crypto";
import type { PgBoss } from "pg-boss";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { env } from "../../env.ts";
import { startBoss } from "../../jobs/boss.ts";
import { queues } from "../../jobs/queues.ts";
import { textEvent } from "./line-webhook.fixtures.ts";
import type { LineEventJob } from "./line-webhook.jobs.ts";
import { lineWebhookRoutes } from "./line-webhook.routes.ts";

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

function sign(body: string): string {
  return createHmac("sha256", env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64");
}

function post(body: string, headers: Record<string, string>) {
  return lineWebhookRoutes({ boss }).request("/", {
    method: "POST",
    body,
    headers,
  });
}

function queued() {
  return boss.fetch<LineEventJob>(queues.lineEvent, { batchSize: 10 });
}

test("rejects a request without a signature header", async () => {
  const res = await post(
    JSON.stringify({ destination: "U", events: [textEvent("E1")] }),
    {},
  );
  expect(res.status).toBe(401);
  expect(await queued()).toHaveLength(0);
});

test("rejects a bad signature before parsing the body", async () => {
  const res = await post("not json", { "x-line-signature": "bad" });
  expect(res.status).toBe(401);
});

test("accepts the LINE console verify request without enqueuing", async () => {
  const body = JSON.stringify({ destination: "U", events: [] });
  const res = await post(body, { "x-line-signature": sign(body) });
  expect(res.status).toBe(200);
  expect(await queued()).toHaveLength(0);
});

test("enqueues one job per event", async () => {
  const body = JSON.stringify({
    destination: "U",
    events: [textEvent("E1"), textEvent("E2")],
  });
  const res = await post(body, { "x-line-signature": sign(body) });
  expect(res.status).toBe(200);
  const ids = (await queued()).map((job) => job.data.event.webhookEventId);
  expect(ids.sort()).toEqual(["E1", "E2"]);
});

test("enqueues a redelivered event only once", async () => {
  const body = JSON.stringify({ destination: "U", events: [textEvent("E1")] });
  await post(body, { "x-line-signature": sign(body) });
  await post(body, { "x-line-signature": sign(body) });
  expect(await queued()).toHaveLength(1);
});
