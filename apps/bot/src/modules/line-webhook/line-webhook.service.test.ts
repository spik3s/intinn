import type { messagingApi } from "@line/bot-sdk";
import { expect, test } from "vitest";
import {
  followEvent,
  stickerEvent,
  textEvent,
} from "./line-webhook.fixtures.ts";
import {
  replyToLineEvent,
  type LineReplyClient,
} from "./line-webhook.service.ts";

function fakeLine() {
  const requests: messagingApi.ReplyMessageRequest[] = [];
  const client: LineReplyClient = {
    replyMessage: (request) => {
      requests.push(request);
      return Promise.resolve({ sentMessages: [] });
    },
  };
  return { client, requests };
}

test("echoes a text message through the reply token", async () => {
  const { client, requests } = fakeLine();
  await replyToLineEvent(textEvent("E1", "สวัสดี 🌞"), client);
  expect(requests).toEqual([
    {
      replyToken: "reply-token",
      messages: [{ type: "text", text: "Intinn ได้ยินว่า: สวัสดี 🌞" }],
    },
  ]);
});

test("does not reply to a sticker message", async () => {
  const { client, requests } = fakeLine();
  await replyToLineEvent(stickerEvent("E2"), client);
  expect(requests).toEqual([]);
});

test("does not reply to a follow event", async () => {
  const { client, requests } = fakeLine();
  await replyToLineEvent(followEvent("E3"), client);
  expect(requests).toEqual([]);
});
