# Intinn research notes (2026-11-03)

## LINE (Thailand)
- Plans (THB/month excl. VAT): Free 0 / 300 msgs / no overage; Basic 1,280 / 15,000 / 0.10 per extra; Pro 1,780 / 35,000 / 0.06 per extra. Pro cheaper than Basic above ~20k msgs (~210 users).
- Push/multicast/narrowcast/broadcast count (requests x recipients; up to 5 message objects per request count once). Reply is free.
- Reply token: single use, ~1 min (20 min for redelivered webhook); "subject to change".
- Cost at ~95 pushes/user/month: 100 users ~1,280 THB; 1,000 ~5,380; 10,000 ~56,680 (excl. VAT).
- Push reducers: multi-bubble single push; rich menu / quick-reply postbacks -> free reply; fold pending content into reply when user writes first; loading animation (5-60s) then reply, push only if token expired; check quota endpoints.
- No numeric frequency cap; TH OA guideline (2026-10-06) bans content causing "discomfort or inconvenience".
- @line/bot-sdk 11.4.0 (2026-10-27), Node >= 22, TS types, middleware + validateSignature, LineBotClient.
- Webhook must 2xx within 2s; redelivery off by default; dedupe on webhookEventId. Push 2,000 req/s.
- LIFF v2.31.2; LINE recommends new LIFF apps be built as LINE MINI Apps (available in TH). userId stable per provider: keep all channels under one provider; verify liff.getIDToken() server-side via /oauth2/v2.1/verify, use `sub`.

## Human Design chart computation
- OSS libs are single-maintainer: natalengine 1.6.1 (MIT, JS, astronomy-engine, full chart, accuracy log vs Jovian PDFs), hd-chart-engine 0.1.1 (MIT, TS, activations only), free-human-design (MIT, lower accuracy), openhumandesign-library (AGPL). Python options AGPL/GPL/unmaintained.
- Swiss Ephemeris: AGPL or Professional License CHF 700 one-time, unlimited projects. `sweph` 2.10.3-8 binding: TS types, prebuilt binaries, no data files, true + mean node.
- Astronomy Engine (MIT, last release 2.1.19 Dec 2023): Moon ~2" median / 27" worst vs Swiss; line = 3,375" so sufficient. No node function; true node must be derived.
- Mainstream HD uses true node (not officially confirmed by Jovian).
- Paid APIs: RoxyAPI $39-149/mo (terms 404); humandesignapi.nl one dev, no SLA; Bodygraph forbids income use without permission.
- Birthplace -> UTC: Thailand = Asia/Bangkok, +07:00 since 1920, no DST. Foreign: geocode -> geo-tz -> Luxon/Temporal. Pitfalls: Buddhist Era years (BE = CE + 543), unknown birth time (Moon ~1 line / 2h), DST gaps, pin tzdata.
- Agent recommendation: own TS engine on sweph + CHF 700 licence; fallback astronomy-engine. Verify with ~100 fixture charts + 1,000 seeded births vs pyswisseph; assert 88 deg design arc.

## Tooling (versions per npm registry, to re-verify at scaffold time)
- Node 26 LTS; pnpm 12 (minimumReleaseAge); TS 7.0.2 latest but typescript-eslint 8.72 needs TS < 6.1 -> use TS 6.0.x for now.
- ESLint 10 + typescript-eslint strictTypeChecked + Prettier (alt: TS7 + Oxlint/tsgolint). Vitest 5.1. Hono 4.13 (v5 RC). Drizzle 0.45 (1.0 RC). pg-boss 12 (cron w/ tz, delayed jobs, retries, DLQ). Zod 4. @anthropic-ai/sdk 1.3 (messages.parse + zodOutputFormat; Batch API -50%).
- knip, dependency-cruiser, gitleaks, jscpd (CI threshold).
- Claude Code: CLAUDE.md < 200 lines; .claude/rules/*.md with paths; hooks (PostToolUse format, Stop typecheck, PreToolUse protect paths); deny Read(./.env); skills; read-only reviewer subagent; /code-review, /security-review, security-guidance plugin; anthropics/claude-code-action@v1; Context7 MCP.
- Hosting SG: Fly.io sin ~$47/mo (1GB machine + managed PG); Railway ~$10-20; Render ~$13; Cloud Run + Cloud SQL ~$11 DB + always-on instance (Bangkok region since Jan 2026). Neon/Supabase: DB only; poolers break LISTEN/NOTIFY.
