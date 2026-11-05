import type { webhook } from "@line/bot-sdk";

function eventBase(webhookEventId: string) {
  return {
    mode: "active",
    timestamp: 1_762_150_000_000,
    source: { type: "user", userId: "U-test" },
    webhookEventId,
    deliveryContext: { isRedelivery: false },
    replyToken: "reply-token",
  } as const;
}

export function textEvent(
  webhookEventId: string,
  text = "hello",
): webhook.MessageEvent {
  return {
    ...eventBase(webhookEventId),
    type: "message",
    message: { type: "text", id: "m1", text, quoteToken: "q" },
  };
}

export function stickerEvent(webhookEventId: string): webhook.MessageEvent {
  return {
    ...eventBase(webhookEventId),
    type: "message",
    message: {
      type: "sticker",
      id: "m2",
      packageId: "446",
      stickerId: "1988",
      stickerResourceType: "STATIC",
      quoteToken: "q",
    },
  };
}

export function followEvent(webhookEventId: string): webhook.FollowEvent {
  return {
    ...eventBase(webhookEventId),
    type: "follow",
    follow: { isUnblocked: false },
  };
}
