import type { messagingApi, webhook } from "@line/bot-sdk";
import { th } from "../../lib/copy/th.ts";
import { logger } from "../../lib/logger.ts";

export type LineReplyClient = Pick<
  messagingApi.MessagingApiClient,
  "replyMessage"
>;

export async function replyToLineEvent(
  event: webhook.Event,
  line: LineReplyClient,
): Promise<void> {
  if (
    event.type !== "message" ||
    event.message.type !== "text" ||
    event.replyToken === undefined
  ) {
    logger.debug(
      { type: event.type, webhookEventId: event.webhookEventId },
      "line event ignored",
    );
    return;
  }

  await line.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: "text", text: th.echo(event.message.text) }],
  });
}
