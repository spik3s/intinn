import { expect, test } from "vitest";
import { createDb } from "../db/client.ts";
import { env } from "../env.ts";
import { createApp } from "./app.ts";

test("GET /health reports ok when the database answers", async () => {
  const db = createDb(env.DATABASE_URL);
  const res = await createApp({ db }).request("/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
  await db.$client.end();
});

test("GET /health reports unavailable when the database is down", async () => {
  const db = createDb("postgres://intinn:intinn@localhost:1/intinn");
  const res = await createApp({ db }).request("/health");
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ status: "unavailable" });
  await db.$client.end();
});
