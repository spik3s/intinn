import type { webhook } from "@line/bot-sdk";

export function textEvent(
  webhookEventId: string,
  text = "hello",
): webhook.MessageEvent {
  return {
    type: "message",
    mode: "active",
    timestamp: 1_762_150_000_000,
    source: { type: "user", userId: "U-test" },
    webhookEventId,
    deliveryContext: { isRedelivery: false },
    replyToken: "reply-token",
    message: { type: "text", id: "m1", text, quoteToken: "q" },
  };
}
