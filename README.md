# Intinn

Intinn is a LINE chatbot for users in Thailand: a friend who keeps you moving with the Human Design strategy that suits your energy, and who cares about how you are doing.

- Setup design: [docs/superpowers/specs/2026-11-03-project-setup-design.md](docs/superpowers/specs/2026-11-03-project-setup-design.md)
- Conventions for humans and Claude: [CLAUDE.md](CLAUDE.md)

## Prerequisites

- Node 26.13.0 via asdf: `asdf install` (reads `.tool-versions`)
- pnpm 12: `npm install -g pnpm@12.16.1 && asdf reshim nodejs`
- Docker Desktop
- `brew install gitleaks cloudflared`

## Setup

```bash
pnpm install
docker compose up -d --wait
cp apps/bot/.env.example apps/bot/.env
```

Fill in the two LINE values in `apps/bot/.env` (see below). Never commit this file.

In Claude Code, install the security plugin the project settings enable (once per machine; needs Python 3):

```bash
claude plugin install security-guidance@claude-plugins-official --scope project
```

## Run and check

```bash
pnpm dev     # bot on http://localhost:3010, restarts on change
pnpm check   # typecheck, lint, format, tests, dead code, layer rules, duplication
```

`GET /health` returns `{"status":"ok"}` when the database answers.

## Connect a LINE channel

Since September 2024, LINE creates Messaging API channels only from LINE Official Account Manager, not from the Developers Console.

1. On the [LINE Official Account Manager](https://manager.line.biz/) website (the phone app has no Messaging API settings), create a LINE Official Account. Set its country or region to **Thailand**: LINE's plans and prices depend on it.
2. Open the account and go to **Settings → Messaging API → Enable Messaging API**. Create a new provider; don't pick an existing one. You can't change the provider later.
   - Name it after whoever runs Intinn. Users see the provider name on LINE's consent screens.
   - Keep every future channel (LINE Login, MINI App) under this provider. LINE gives a user a different ID under each provider, and a channel can't move to another provider.
3. In **Settings → Response settings**, turn off the greeting message and auto-response messages, and turn on webhooks.
4. In the [LINE Developers Console](https://developers.line.biz/console/), open the channel. Put its channel secret (**Basic settings** tab) and a long-lived channel access token (**Messaging API** tab, **Issue**) in `apps/bot/.env`.
5. Start the bot with `pnpm dev`, and a tunnel to it:

   ```bash
   cloudflared tunnel --url http://localhost:3010
   ```

6. In the channel's **Messaging API** tab, set the webhook URL to `<tunnel URL>/webhooks/line`. Turn on **Use webhook** and **Webhook redelivery**, and press **Verify**. Redelivery is safe: the bot drops an event it has already queued.
7. Scan the QR code on the same tab to add the bot as a friend, and send it a text message. It answers `Intinn ได้ยินว่า: <your text>`.

The tunnel URL changes each time `cloudflared` starts, so update the webhook URL after a restart.
