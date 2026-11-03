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

## Run and check

```bash
pnpm dev     # bot on http://localhost:3000, restarts on change
pnpm check   # typecheck, lint, format, tests, dead code, layer rules, duplication
```

`GET /health` returns `{"status":"ok"}` when the database answers.

## Connect a LINE channel

1. In the [LINE Developers Console](https://developers.line.biz/console/), create a provider named **Intinn**. Keep every future channel (LINE Login, MINI App) under this provider, so user IDs stay the same across them.
2. Create a **Messaging API** channel. Put its channel secret and a long-lived channel access token in `apps/bot/.env`.
3. In [LINE Official Account Manager](https://manager.line.biz/), turn off auto-reply messages and greeting messages.
4. Start a tunnel to your local bot:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

5. In the channel's Messaging API settings, set the webhook URL to `<tunnel URL>/webhooks/line`, turn on **Use webhook**, and press **Verify**.
6. Send the bot a text message. It answers `Intinn ได้ยินว่า: <your text>`.

The tunnel URL changes each time `cloudflared` starts, so update the webhook URL after a restart.
