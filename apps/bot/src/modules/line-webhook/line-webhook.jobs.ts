import type { webhook } from "@line/bot-sdk";
import type { PgBoss } from "pg-boss";
import { v5 as uuidv5 } from "uuid";
import { queues } from "../../jobs/queues.ts";

// Fixed so the same webhookEventId always maps to the same job id.
const LINE_EVENT_JOB_NAMESPACE = "8a9524d9-253a-4393-938e-2ae1d90a399d";

export interface LineEventJob {
  event: webhook.Event;
}

export async function enqueueLineEvent(
  boss: PgBoss,
  event: webhook.Event,
): Promise<void> {
  // pg-boss skips an id it already holds, which is how a redelivered event is dropped.
  await boss.send(queues.lineEvent, { event } satisfies LineEventJob, {
    id: uuidv5(event.webhookEventId, LINE_EVENT_JOB_NAMESPACE),
  });
}
