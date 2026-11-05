# Intinn

LINE chatbot for users in Thailand: a friend who keeps you moving with the Human Design strategy that suits your energy, and who cares how you are doing. Daily, weekly and monthly messages are written by AI per user; users can also chat at any time.

- Setup design (why the project looks like this): `docs/superpowers/specs/2026-11-03-project-setup-design.md`
- Each product feature gets its own design in `docs/superpowers/specs/` before code.

## Commands

```bash
pnpm install                       # deps (pnpm 12, Node 26 via .tool-versions)
docker compose up -d --wait        # Postgres: intinn (dev) and intinn_test (tests)
pnpm dev                           # bot on :3010, restarts on change
pnpm check                         # every gate; run before each PR
pnpm test                          # all tests
pnpm --filter @intinn/bot test src/modules/line-webhook   # one area
pnpm typecheck | pnpm lint | pnpm format
pnpm --filter @intinn/bot db:generate   # new migration from *.schema.ts
```

## Structure

```
apps/bot/src/
  main.ts        composition root: db, pg-boss, LINE client, worker, HTTP server
  env.ts         Zod-validated config; the only file that reads process.env
  http/app.ts    Hono app: /health, route mounting, error mapping
  db/client.ts   Drizzle client (migrations/ arrives with the first table)
  jobs/          pg-boss start-up (boss.ts) and every queue name (queues.ts)
  lib/           shared by 2+ modules: logger.ts, copy/<locale>.ts
  modules/<feature>/   one folder per feature; line-webhook is the reference
docs/            specs, plans, research, decisions
.claude/         settings, hooks, rules per area, reviewer agent
.lefthook/       git hook scripts that keep Claude off main
```

## Rules

**Code**

- TypeScript strict. Node runs `.ts` directly: relative imports end in `.ts`; no enums, namespaces or parameter properties.
- Plain functions, no classes of our own, no DI container. Pass dependencies as arguments (see `createApp({ db, boss })`).
- Read config only through `env` from `env.ts`. A new setting goes in the schema and in `apps/bot/.env.example`.
- Log with `logger` from `lib/logger.ts`, never `console`. Never log secrets, tokens or message text.
- Errors are thrown. Routes throw Hono's `HTTPException`. No Result types. Add `lib/errors.ts` with the first domain error.
- Validate at the boundaries only (HTTP input, env, LLM output, data from outside the process). Inside, trust the types.
- Comments explain why, never what.

**Modules**

- Files are `<feature>.<role>.ts`: `routes`, `service`, `jobs`, `repo`, `schema`, `prompts`, `fixtures`, plus `index.ts`. Create only the roles you need.
- Other code imports a module only through its `index.ts`. `lib/`, `db/` and `jobs/` never import modules; modules never import `http/`. dependency-cruiser enforces this.
- To add a feature: copy the shape of `modules/line-webhook`, add its queues to `jobs/queues.ts`, mount its routes in `http/app.ts`, register its workers in `main.ts`.

**Text and AI**

- Fixed user-facing text lives in `lib/copy/th.ts` (Thai is the default). No inline user-facing strings.
- AI prompts are typed functions in `<feature>.prompts.ts`, versioned in git. Structured output is parsed with Zod.

**Tests**

- Write the failing test first. Tests sit next to the code as `*.test.ts`.
- Use the real `intinn_test` database. Fake LINE/Anthropic with `Pick<>` clients. Never `vi.mock` our own modules.
- Test files run one at a time (`fileParallelism: false`): they share the database and its pg-boss queues.

**Dependencies**

- Prefer what is installed. A new dependency needs a reason in the PR description.
- pnpm refuses versions younger than 3 days (`minimumReleaseAge`) and blocks install scripts unless `pnpm-workspace.yaml` `allowBuilds` says otherwise. Decide each one deliberately.

## Workflow

- Work on a branch named `<type>/<topic>` (`feat/`, `fix/`, `chore/`, `docs/`, `ci/`). Never commit to or push `main`; git hooks refuse it (see Known surprises).
- Commit messages follow the same types: `feat: …`, `fix: …`, `chore: …`.
- Run `pnpm check` before opening a PR, and fill in the PR template.
- Claude reviews each of the owner's PRs when it opens or is marked ready (code review, then security review). The owner can comment `@claude review` to run it again; the code-review plugin may skip a PR it has already commented on, while the security review always runs. Use the `reviewer` agent locally before pushing.
- Record a non-obvious decision as `docs/decisions/NNNN-short-title.md` (context, decision, consequences).

## Known surprises

- TypeScript is pinned to 6.0.x: typescript-eslint 8 supports only `typescript <6.1`, and TypeScript 7 has no API for it. Upgrade both together, by hand: Dependabot skips TypeScript minor and major updates.
- Every pg-boss queue must be listed in `jobs/queues.ts`; `startBoss` creates them, and `send`/`work` fail on a queue that was never created.
- LINE gives the webhook 2 seconds. Never do slow work in a route; enqueue it.
- Prettier runs with its defaults (double quotes). Don't add a Prettier config to change style.
- The `main` guard: when Claude Code runs git (`CLAUDECODE=1`), the lefthook scripts in `.lefthook/` refuse a commit on `main` and any push to `main`. The owner is not affected. A PreToolUse hook blocks the ways around them (`--no-verify`, `commit -n`, `LEFTHOOK=`, `core.hooksPath`), and it also blocks a command that merely quotes those words, so write such text with the file tools instead of the shell.
- The guard needs installed git hooks: `pnpm install` runs `lefthook install` through the root `prepare` script.
