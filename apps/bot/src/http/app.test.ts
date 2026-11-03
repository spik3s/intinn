import type { PgBoss } from "pg-boss";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createDb } from "../db/client.ts";
import { env } from "../env.ts";
import { startBoss } from "../jobs/boss.ts";
import { createApp } from "./app.ts";

let boss: PgBoss;

beforeAll(async () => {
  boss = await startBoss(env.DATABASE_URL);
});

afterAll(async () => {
  await boss.stop();
});

test("GET /health reports ok when the database answers", async () => {
  const db = createDb(env.DATABASE_URL);
  const res = await createApp({ db, boss }).request("/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
  await db.$client.end();
});

test("GET /health reports unavailable when the database is down", async () => {
  const db = createDb("postgres://intinn:intinn@localhost:1/intinn");
  const res = await createApp({ db, boss }).request("/health");
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ status: "unavailable" });
  await db.$client.end();
});
