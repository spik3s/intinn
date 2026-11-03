# Intinn: Project Setup Design

Date: 2026-11-03
Status: draft for owner review

## 1. Intent

Intinn is a LINE chatbot for users in Thailand. It acts as a friend who pushes you forward using the Human Design strategy that suits your energy (the productivity side), and who understands and cares for you (the spiritual, holistic side).

This document covers **only the project foundation**: stack, repository structure, conventions, quality gates, Claude Code setup, and a small working "walking skeleton". Each product feature gets its own design later.

**Why the foundation matters:** Claude Code will write most of the code. The owner is an ex-engineer turned product manager. They want:

- well-defined conventions and structure that new code follows
- reuse of mature libraries and of our own code, instead of reinvention
- simplicity, and no AI slop
- no new coding patterns without a reason
- typed code
- a setup that makes AI code review high quality and security-focused

## 2. Product context (shapes the architecture, not built here)

From the owner:

- **Onboarding:** a chart reading (what suits them, their practice and strategy) and a year intention (which area they want to improve).
- **Daily:** morning affirmation, afternoon reminder (be kind, keep to your strategy), evening gratitude plus a suggestion before bed.
- **Weekly:** Sunday energy reset framed for their Type.
- **Monthly:** wrap-up (what they did well, progress) and a bigger energy reset.
- **Getting back on track:** a reminder and framework when a user misses daily check-ins or to-dos.
- **Challenges** from time to time (e.g. Project 50, 12-week challenge, 75 Hard).

Confirmed with the owner:

- AI writes messages fresh per user from their chart, intention and recent check-ins.
- Users can chat freely at any time.
- Many users (a product, possibly paid).
- Messages arrive at each user's local times.
- First users are in Thailand; Thai first, English possibly.

Architecture consequences:

- Per-user scheduled jobs.
- An inbound message queue.
- An LLM client with structured output.
- User-level history (check-ins, intentions).
- Locale-aware fixed text.

## 3. Goals

1. The right way to add code is obvious from the repo and **enforced by tools**, not only by prose.
2. A fast feedback loop for Claude: format on every edit, a type check before Claude reports a task as done, and one `pnpm check` command that runs every gate.
3. Every PR gets an automated Claude code review and security review.
4. A walking skeleton that proves the pipeline end to end. It is the reference pattern that features copy.

## 4. Non-goals

- No product features: no chart, check-ins, scheduled content or AI messages.
- No hosting or deployment. Decide at the first deploy (see §10).
- No LINE MINI App (LIFF) yet.
- No admin UI.

## 5. Anti-goals (failure even if it works)

- Speculative abstractions "for later": generic repositories, base classes, DI containers, plugin systems.
- Hand-rolled versions of what a mature library already does: signature checks, validation, job scheduling, retries, time zones.
- Two ways to do one thing: two validation libraries, two date libraries, mixed error-handling styles.
- Rules that live only in prose when a tool could enforce them.
- Comments that restate the code; docs that drift from the code.

## 6. Constraints

**LINE Messaging API.** Research notes: `docs/research/2026-11-03-platform-research.md`.

- **Webhook:** must return 2xx within 2 s.
  - Verify the signature on the **raw** body.
  - Redelivery and duplicates happen, so dedupe on `webhookEventId`.
  - Do the work asynchronously.
- **Reply token:** single use, valid about 1 minute.
- **Cost:** replies are free. Push, multicast, narrowcast and broadcast count against a paid monthly quota.
  - The free plan covers about 3 users on the planned schedule.
  - The architecture must make "answer with a reply instead of a push" easy to add later.
- `@line/bot-sdk` 11.x needs Node ≥ 22.
- Put all LINE channels (Messaging API, LINE Login, MINI App) under **one provider**, so the `userId` is the same across them.

**Data**

- Timestamps are stored in UTC (`timestamptz`).
- Each user has an IANA time zone. The default is `Asia/Bangkok`.

**Secrets**

- Never commit secrets.
- Local secrets live in a plain, gitignored `.env`. A committed `.env.example` lists the keys without values.
- **Owner decision:** keeping Claude out of `.env` is best effort, which is enough for now. That means `deny Read(./.env*)`, plus Bash deny patterns for common file readers (`cat`, `grep`, `head` and similar on `.env*`).

**Public repo**

- **Owner decision:** the repo is public for now.
- So gitleaks in pre-commit and in CI is critical.
- Workflows never use `pull_request_target`, so PRs from forks never see repository secrets.
- Logs never print secrets.

**Budget**

- Small. Add no paid service until a feature needs it.

**Prompts**

- AI prompts live in the repo, versioned in git. **Owner decision:** Langfuse is not used.

## 7. Decisions

Every decision in this section is **Claude's call** unless marked **Owner**. Claude showed the stack to the owner, and the owner only corrected the prompt storage.

### 7.1 Stack

| Slot               | Choice                                                                    | Reason                                                                                                        |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Language           | TypeScript, strict (**Owner**: typed)                                     | Compiler catches a class of bugs before review                                                                |
| Runtime            | Node 26 LTS, ESM only                                                     | Current LTS; LINE SDK needs ≥ 22                                                                              |
| Package manager    | pnpm, pinned via `packageManager`, `minimumReleaseAge` set                | Strict resolution; delays brand-new releases (supply chain)                                                   |
| TypeScript version | 6.0.x                                                                     | typescript-eslint does not support TS 7 yet; revisit when it does                                             |
| HTTP               | Hono 4 + `@hono/node-server`                                              | Small; typed; typed RPC client for the future MINI App                                                        |
| Validation         | Zod 4                                                                     | One schema library for env, HTTP, job payloads, LLM output                                                    |
| Database           | Postgres + Drizzle ORM + drizzle-kit (generated SQL migrations committed) | Schema in TS, SQL-like queries, no codegen step                                                               |
| Jobs and schedules | pg-boss                                                                   | Queues, delayed jobs, cron with time zones, retries, dead-letter queue; runs in Postgres, so no extra service |
| LINE               | `@line/bot-sdk` 11                                                        | Official SDK; signature middleware                                                                            |
| AI                 | `@anthropic-ai/sdk`                                                       | Added with the first AI feature, not in the skeleton                                                          |
| Logging            | pino, with redaction of secrets and tokens                                | Standard structured logs                                                                                      |
| Tests              | Vitest                                                                    | Standard                                                                                                      |
| Lint and format    | ESLint (flat config) + typescript-eslint `strictTypeChecked` + Prettier   | Strongest type-aware rules against slop; best known to Claude                                                 |
| Structure          | dependency-cruiser                                                        | Layer rules, no cycles                                                                                        |
| Dead code          | knip                                                                      | Unused files, exports, dependencies                                                                           |
| Duplication        | jscpd (CI threshold only)                                                 | Catches copy-paste                                                                                            |
| Secrets            | gitleaks (pre-commit and CI)                                              | Catches committed secrets                                                                                     |
| Git hooks          | lefthook                                                                  | One binary; fast                                                                                              |
| Dependency updates | Dependabot, weekly, grouped                                               | Native to GitHub                                                                                              |
| Local services     | Docker Compose (Postgres)                                                 | Owner has Docker                                                                                              |
| Local tunnel       | cloudflared quick tunnel                                                  | Free, no account, for the LINE webhook                                                                        |

Re-check versions against the npm registry at scaffold time. The research notes list what was current on 2026-11-03.

### 7.2 Repository layout

The repo is a pnpm workspace with one app now. Claude's call: the MINI App is a known near-term need and will share types with the server.

```
.
├── CLAUDE.md
├── .claude/            settings.json, rules/, agents/
├── .github/            workflows/, dependabot.yml, pull_request_template.md
├── docs/
│   ├── superpowers/specs/   designs (this file)
│   ├── research/            dated research notes
│   └── decisions/           short ADRs, one per non-obvious decision
├── apps/
│   └── bot/
│       └── src/
│           ├── main.ts      composition root: starts HTTP server and job worker
│           ├── env.ts       Zod-validated config; the only place that reads process.env
│           ├── http/        Hono app, middleware, route mounting
│           ├── db/          Drizzle client, migrations/ (drizzle-kit reads schemas from modules/*/*.schema.ts)
│           ├── jobs/        pg-boss setup, queue names
│           ├── lib/         shared helpers used by 2+ modules (logger, copy/ for fixed text per locale)
│           └── modules/
│               └── line-webhook/   reference module (walking skeleton)
├── docker-compose.yml
├── eslint.config.js, .prettierrc, .dependency-cruiser.cjs, knip.json, lefthook.yml
└── package.json, pnpm-workspace.yaml, tsconfig.base.json, .tool-versions
```

- Add `packages/*` only when two apps share code.
- One Node process runs both the HTTP server and the pg-boss worker. Split them later if needed.

### 7.3 Module convention

A feature module is a folder under `modules/<feature>/`. It holds only the files it needs:

- `<feature>.routes.ts`: Hono routes.
- `<feature>.service.ts`: business logic as plain functions.
- `<feature>.jobs.ts`: job handlers.
- `<feature>.repo.ts`: database queries.
- `<feature>.schema.ts`: Drizzle tables.
- `<feature>.prompts.ts`: prompt builders, typed input → prompt.
- `index.ts`: the module's public API.
- `*.test.ts`: tests, next to the code they test.

Rules enforced by dependency-cruiser and ESLint:

- One module imports another only through its `index.ts`.
- `lib/`, `db/` and `jobs/` never import from `modules/`. `modules/` never imports from `http/`.
- No import cycles.
- Only `env.ts` reads `process.env`.
- No `console`. Use the logger.

### 7.4 Code conventions (summarised in CLAUDE.md)

**Code style**

- Plain functions and modules. Use classes only when a library requires them. No DI container: pass dependencies as arguments.
- Errors are thrown. No Result types.
  - Routes throw Hono's `HTTPException`.
  - A small set of app error classes in `lib/errors.ts` arrives with the first domain error.
  - Hono's `onError` maps both kinds to responses.
- Validate at the boundaries only: HTTP input, job payloads from outside the process, env, LLM output. Inside a boundary, trust the types.
  - LINE webhook bodies are authenticated by the signature check, then typed with the SDK's own types. We don't re-declare LINE's schema in Zod.
- Files use kebab-case. Types use PascalCase. Database columns use snake_case, through Drizzle's `casing` option.
- Comments explain _why_, never _what_.

**Dependencies**

- Every new dependency needs a reason in the PR description. Prefer what is already installed.

**Data and time**

- Use one date/time library. Pick it with the first scheduling feature: Temporal if Drizzle and pg-boss work with it cleanly, otherwise Luxon.

**User-facing text**

- Fixed user-facing text lives in one catalog per locale. Thai is the default.
- AI-generated text receives the user's locale.

**Prompts**

- Prompts are typed functions in the owning module.
- Structured LLM output is parsed with Zod.

**Tests**

- Integration tests use a real Postgres test database, never a database mock.
- LINE and Anthropic calls are faked at the client boundary.

### 7.5 Quality gates

- **`pnpm check`** runs typecheck, lint, format check, tests, knip, dependency-cruiser and jscpd. CI runs the same command, plus gitleaks.
- **Pre-commit (lefthook):** Prettier and ESLint on staged files, plus gitleaks. Keep it fast.
- **CI (GitHub Actions)**, on every PR and on `main`:
  - It runs `pnpm check` against a Postgres service container.
  - Claude code review and security review run on PRs (§7.6).
- **`main` protection — Owner decision: enforced locally, free.**
  - A Claude Code `PreToolUse` hook on Bash blocks `git commit` while on `main`, and any `git push` to `main`.
  - So every change Claude makes goes through a branch and a PR, where CI and the Claude review run.
  - The owner is not blocked.
  - There is no GitHub ruleset (see §11).
  - **Bootstrap exception:** the first commit, with only the docs, goes straight to `main` so the repo has a default branch. The scaffold then lands as the first PR.

### 7.6 Claude Code setup

**`CLAUDE.md`** (under 200 lines), with:

- what Intinn is, in three lines
- exact commands
- a structure map
- the conventions in §7.4
- "to add a feature, copy `modules/line-webhook`"
- a section for surprises we learn along the way

**`.claude/rules/*.md`**: area rules scoped by `paths:`:

- `line.md`: raw-body signature check, the 2 s limit, dedupe, reply vs push.
- `db.md`: generate migrations with drizzle-kit; never edit an applied migration.
- `testing.md`
- `prompts.md`

**`.claude/settings.json`** (committed)

Permissions:

- allow the project's `pnpm` scripts and read-only `git`
- ask before `git push`
- deny `Read(./.env*)`

Hooks:

- `PostToolUse` on `Edit|Write`: run Prettier and `eslint --fix` on the changed file.
- `Stop`: run `pnpm typecheck`, and exit 2 on failure so Claude fixes it before finishing.
- `PreToolUse`:
  - block edits to `.env*` and to applied migrations
  - block commits on `main` and pushes to `main` (§7.5)

Enable the official `security-guidance` plugin.

**`.claude/agents/reviewer.md`**: a read-only reviewer (Read, Grep, Glob). It checks:

- correctness
- security
- adherence to conventions
- reuse ("does this already exist?")
- AI slop

It skips style, which the tools handle.

**`.mcp.json`**: Context7, for up-to-date library docs. Several of our libraries are newer than Claude's training data.

**PR review:** `anthropics/claude-code-action@v1` runs `/code-review` and a security review.

- **Authentication — Owner decision:** the owner's Claude Max subscription.
  - The owner runs `claude setup-token`.
  - The owner stores the result as the repository secret `CLAUDE_CODE_OAUTH_TOKEN`.
  - Claude never handles the token.
- **When it runs — Claude's call:**
  - The trigger is `pull_request`, types `opened`, `reopened` and `ready_for_review`. Draft PRs are skipped.
  - The owner can request a new review by commenting `@claude review`.
- **Effect:** comments only. Reviews are not a required check, so a rate-limited run never blocks a merge.
- **Caveat:** the action may refuse to run a workflow file that differs from the one on the default branch. If so, success criterion 4 is checked on the first PR after the scaffold merges.

Add project skills only when a workflow repeats. None are needed on day one.

### 7.7 Walking skeleton (reference module `line-webhook`)

**`GET /health`**

- Returns 200 when the database answers.

**`POST /webhooks/line`**

1. The SDK's `validateSignature` checks the raw body.
2. A `line.event` job is enqueued for each event.
   - The job id is a UUIDv5 of the `webhookEventId`, so pg-boss ignores a duplicate. pg-boss keeps completed jobs for 7 days, which is the dedupe window.
   - There is no `line_events` table. The first database table arrives with the first feature.
3. The endpoint returns 200 at once.

**Worker for `line.event`**

- For a text message, it replies through the reply token with a fixed Thai echo (e.g. "Intinn ได้ยินว่า: …").
- Other events are logged and marked handled.

**Tests**

- bad signature → 401
- a duplicate event is not enqueued twice
- the worker calls the reply API with the expected payload (fake LINE client)
- `/health` reports the database state

**Local dev**

- `docker compose up -d` starts Postgres.
- `pnpm dev` runs the bot in watch mode.
- A cloudflared tunnel exposes the webhook.
- The README explains how to point a LINE channel at the tunnel.

## 8. Success criteria

1. On a clean clone, `pnpm install && pnpm check` passes locally and in CI.
2. Each of these deliberate violations fails `pnpm check` or pre-commit:
   - importing `http/` from a module
   - reading `process.env` outside `env.ts`
   - an unused export
   - a fake secret
   - a floating promise
3. Claude Code hooks fire: the file is formatted after an edit, and the type check runs on stop.
4. Opening a PR on GitHub produces a Claude review comment.
5. With a real LINE channel and a tunnel, sending a text to the bot returns the echo. This is a manual check that needs the owner's LINE channel.

## 9. Left to the builder

- Exact config contents, CI caching, script names other than `check`, `dev`, `test` and `typecheck`.
- How to fake HTTP clients in tests.
- The jscpd threshold.
- Whether the Stop hook also runs lint. Keep it fast.

## 10. Deferred decisions (not this work)

| Decision                    | When                  | Options from research                                                                                                                                                                             |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chart engine base           | Chart feature         | Swiss Ephemeris via `sweph` + CHF 700 professional licence (matches the big chart sites) vs Astronomy Engine (MIT, free, needs a derived true node). Verify against ~100 known charts either way. |
| Hosting                     | First deploy          | Fly.io Singapore (~$47/mo with managed Postgres) vs Railway (~$10–20/mo)                                                                                                                          |
| LINE plan                   | First real users      | Basic 1,280 THB/mo, or Pro 1,780 THB/mo + 0.06 THB/msg above ~210 users                                                                                                                           |
| Claude model per feature    | Each AI feature       | Batch API (50% cheaper) suits pre-generated daily messages                                                                                                                                        |
| Push vs pull content design | Daily-message feature | Rich-menu "today's message" button gives free replies                                                                                                                                             |

## 11. Owner decisions and open question

Decided on 2026-11-03:

- The repo is public for now.
- PR reviews use the owner's Claude Max subscription.
- A plain `.env` with best-effort blocking.
- `main` protection is enforced locally, for free.

**Open:** now that the repo is public, GitHub's own protection is free too. It would be a ruleset that requires the CI check on `main`, with no required approvals, and it would also block the owner. Default: not added, per the owner's choice of local enforcement.

## 12. Changes made during planning (2026-11-03)

1. **Dedupe moved from a `line_events` table to the pg-boss job id.**
   - The table version needed hand-written transaction code: Drizzle's transaction does not expose its connection to pg-boss.
   - Without that code, an event could be stored but never enqueued.
2. **No `lib/errors.ts` yet.** Hono's `HTTPException` covers the skeleton.
3. **LINE bodies are typed by the SDK after the signature check**, not re-validated with Zod.
4. **Node runs `.ts` files directly** (built-in type stripping), so there is no build step and no `tsx`.
   - Imports use `.ts` extensions.
   - `erasableSyntaxOnly` bans enums and namespaces.

## 13. Owner actions needed during setup

- Install Node 26 (via asdf) and pnpm.
- Run `claude setup-token` and add the token as the repository secret `CLAUDE_CODE_OAUTH_TOKEN`.
- Approve the first push to GitHub.
- For success criterion 5 only: create a LINE Official Account with a Messaging API channel under a new provider, and put its secret and access token in `.env`.
