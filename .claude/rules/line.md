---
paths:
  - "apps/bot/src/modules/line-*/**"
---

# LINE Messaging API

- Check the `x-line-signature` with `validateSignature` on the **raw** body before parsing it. Missing or bad signature → `HTTPException(401)`.
- LINE expects 2xx within 2 seconds. The route only enqueues; all real work runs in a pg-boss job.
- Dedupe is the job id: a UUIDv5 of `webhookEventId`. pg-boss drops a duplicate id. Don't add a second dedupe mechanism.
- A reply token is single use and valid for about 1 minute. Slow work (AI replies) shows LINE's loading animation, then replies.
- Replies are free; push, multicast and broadcast messages cost money. Prefer a reply whenever the user wrote first.
- The SDK's types (`webhook.*`, `messagingApi.*`) are the source of truth for payloads. Don't re-declare them in Zod.
- Every LINE channel (Messaging API, LINE Login, MINI App) lives under the provider "Intinn", so a `userId` is the same everywhere.
- Fixed user-facing text comes from `lib/copy/<locale>.ts`, never inline strings.
