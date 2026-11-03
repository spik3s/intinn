# Intinn Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the project foundation for Intinn: a pnpm workspace with one TypeScript app, quality gates enforced by tools, a Claude Code setup, CI with Claude review, and an echo bot that proves the LINE → queue → reply pipeline.

**Architecture:** One Node 26 process runs a Hono HTTP server and a pg-boss worker.

- The LINE webhook verifies the signature on the raw body, enqueues one pg-boss job per event, and returns 200 at once.
- The worker replies to text messages with a fixed Thai echo.
- Postgres, run through Docker Compose locally, holds the pg-boss tables. Drizzle provides the database client.
- Node runs the `.ts` files directly through built-in type stripping. There is no build step.

**Tech Stack:**

| Package            | Version                                                    |
| ------------------ | ---------------------------------------------------------- |
| Node               | 26.13.0                                                    |
| pnpm               | 12.16.1                                                    |
| TypeScript         | 6.0.3                                                      |
| Hono               | 4.13 + `@hono/node-server` 2.1                             |
| Zod                | 4.6                                                        |
| Drizzle ORM        | 0.45 + drizzle-kit 0.31 + `pg` 8.23                        |
| pg-boss            | 12.38                                                      |
| `@line/bot-sdk`    | 11.4                                                       |
| uuid               | 14                                                         |
| pino               | 10 + pino-pretty 13                                        |
| Vitest             | 5.1                                                        |
| ESLint             | 10.14 + typescript-eslint 8.72 + eslint-config-prettier 10 |
| Prettier           | 3.9                                                        |
| knip               | 6.44                                                       |
| dependency-cruiser | 18.7                                                       |
| jscpd              | 5.4                                                        |
| lefthook           | 2.2                                                        |
| gitleaks           | latest via brew                                            |

**Spec:** `docs/superpowers/specs/2026-11-03-project-setup-design.md` (read §6, §7 and §12 before starting). Background research: `docs/research/2026-11-03-platform-research.md`.

## Global Constraints

**Toolchain**

- Node `26.13.0`, pinned in `.tool-versions` (asdf). pnpm `12.16.1`, pinned in root `package.json` `packageManager`.
- TypeScript `6.0.3`, not 7. typescript-eslint 8.72 requires `typescript <6.1`.
- ESM only (`"type": "module"`).
- Relative imports use `.ts` extensions. No enums, namespaces or parameter properties (`erasableSyntaxOnly`).

**Code**

- Only `apps/bot/src/env.ts` reads `process.env`. No `console`; use `logger` from `lib/logger.ts`.
- Plain functions. No classes of our own. No DI container: pass dependencies as arguments.
- Errors are thrown. Routes throw Hono's `HTTPException`. No Result types.
- Files are kebab-case. A module's files are named `<feature>.<role>.ts`, and a module exposes only `index.ts` to other modules.
- Fixed user-facing text lives in `lib/copy/th.ts`. Thai is the default.
- Comments explain _why_, never _what_.

**Tests**

- Tests live next to the code (`*.test.ts`). Integration tests use the real Postgres database `intinn_test`.
- Fake external clients through `Pick<>` types. Never `vi.mock` our own modules.

**Workflow**

- All work after Task 0 happens on branch `chore/project-setup`. Commit at the end of each task.
- Re-check each package version with `npm view <pkg> version` before adding it. If a major version moved since 2026-11-03, stop and ask.
- Never read or print `.env`.

## Review Focus

These are conditions the spec implies that its listed tests don't cover. Each one has a test added to the task that owns it.

1. LINE console "Verify" sends a signed body with `events: []`. Expected: 200, nothing enqueued. (Task 4)
2. Request without an `x-line-signature` header. Expected: 401, not 500. (Task 4)
3. Bad signature on a body that is not even JSON. Expected: 401, so the signature is checked before parsing. (Task 4)
4. Sticker message and follow event. Expected: no reply call, and the handler resolves without error. (Task 5)
5. Thai text with emoji, e.g. `สวัสดี 🌞`. Expected: echoed back exactly after the prefix. (Task 5)

---

### Task 0: Bootstrap git and publish the docs

**Files:**

- Create: `.gitignore`
- Existing: `docs/superpowers/specs/2026-11-03-project-setup-design.md`, `docs/research/2026-11-03-platform-research.md`, this plan

- [ ] **Step 1: Create `.gitignore`**
  - Ignore: `node_modules/`, `coverage/`, `.env` (keep `.env.example` tracked), `*.log`, `.DS_Store`, `.claude/settings.local.json`.

- [ ] **Step 2: Initialise the repo on `main` and commit the docs**

```bash
git init -b main
git add .gitignore docs/
git commit -m "docs: add project setup design, research notes and plan"
git remote add origin https://github.com/spik3s/intinn.git
```

- [ ] **Step 3: Ask the owner before pushing, then push**
  - The owner must approve this first push.
  - Run: `git push -u origin main`
  - Expected: `main` exists on GitHub.

- [ ] **Step 4: Create the work branch**
  - Run: `git switch -c chore/project-setup`

### Task 1: Workspace, TypeScript, Vitest and validated env

**Files:**

- Create: `.tool-versions`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
- Create: `apps/bot/package.json`, `apps/bot/tsconfig.json`, `apps/bot/vitest.config.ts`, `apps/bot/.env.example`
- Create: `apps/bot/src/env.ts`
- Test: `apps/bot/src/env.test.ts`

**Interfaces:**

- Produces: `parseEnv(source: Record<string, string | undefined>): Env`, `env: Env`, `type Env`.
- `Env` fields:
  - `NODE_ENV`: `'development' | 'test' | 'production'`. Default `development`.
  - `PORT`: `number`. Default `3000`.
  - `LOG_LEVEL`: a pino level or `'silent'`. Default `info`.
  - `DATABASE_URL`: `string`, must be a URL.
  - `LINE_CHANNEL_SECRET`: `string`, min length 1.
  - `LINE_CHANNEL_ACCESS_TOKEN`: `string`, min length 1.

- [ ] **Step 1: Install the toolchain**

```bash
asdf install nodejs 26.13.0
npm install -g pnpm@12.16.1
asdf reshim nodejs
```

Expected: `node -v` prints `v26.13.0` and `pnpm -v` prints `12.16.1` inside the repo.

- [ ] **Step 2: Create the workspace files**
  - `.tool-versions`: `nodejs 26.13.0`.
  - Root `package.json`:
    - `name: "intinn"`, `private: true`, `type: "module"`
    - `packageManager: "pnpm@12.16.1"`, `engines.node: ">=26.13.0"`
    - scripts: `typecheck: "pnpm -r typecheck"`, `test: "pnpm -r test"`, `dev: "pnpm --filter @intinn/bot dev"`
  - `pnpm-workspace.yaml`:
    - `packages: ["apps/*"]`
    - `minimumReleaseAge: 4320`, which is 3 days in minutes
    - `onlyBuiltDependencies` lists only the packages whose install scripts we need (expect `lefthook` in Task 7). Add each one deliberately.
  - `tsconfig.base.json` compiler options:
    - `target: "es2024"`, `module: "nodenext"`, `moduleResolution: "nodenext"`
    - `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`
    - `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `allowImportingTsExtensions: true`
    - `noEmit: true`, `skipLibCheck: true`, `types: ["node"]`
  - `apps/bot/package.json`:
    - `name: "@intinn/bot"`, `private: true`, `type: "module"`
    - scripts: `dev: "node --watch --env-file=.env src/main.ts | pino-pretty"`, `start: "node src/main.ts"`, `typecheck: "tsc"`, `test: "vitest run"`, `db:generate: "drizzle-kit generate"`
  - `apps/bot/tsconfig.json` extends `../../tsconfig.base.json` and includes `src`, `*.config.ts`.
  - Add dev dependencies to `@intinn/bot`: `typescript@6.0.3`, `@types/node@26`, `vitest@5`. Add dependency: `zod@4`.

- [ ] **Step 3: Create `apps/bot/vitest.config.ts`**
  - `test.env` holds fixed test values:
    - `NODE_ENV=test`, `LOG_LEVEL=silent`
    - `DATABASE_URL=postgres://intinn:intinn@localhost:5432/intinn_test`
    - `LINE_CHANNEL_SECRET=test-channel-secret`, `LINE_CHANNEL_ACCESS_TOKEN=test-access-token`
  - CI uses the same values.
- [ ] **Step 4: Create `apps/bot/.env.example`**
  - It has the same keys with development values: `DATABASE_URL=postgres://intinn:intinn@localhost:5432/intinn`, `LOG_LEVEL=debug`.
  - The two LINE keys are left empty.

- [ ] **Step 5: Write the failing tests in `apps/bot/src/env.test.ts`**

```ts
const valid = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  LINE_CHANNEL_SECRET: "s",
  LINE_CHANNEL_ACCESS_TOKEN: "t",
};

test("applies defaults for optional settings", () => {
  expect(parseEnv(valid)).toMatchObject({
    NODE_ENV: "development",
    PORT: 3000,
    LOG_LEVEL: "info",
  });
});

test("reads PORT as a number", () => {
  expect(parseEnv({ ...valid, PORT: "8080" }).PORT).toBe(8080);
});

test("names every missing required setting", () => {
  expect(() => parseEnv({})).toThrow(
    /DATABASE_URL[\s\S]*LINE_CHANNEL_SECRET[\s\S]*LINE_CHANNEL_ACCESS_TOKEN/,
  );
});
```

- [ ] **Step 6: Run the tests and check they fail**
  - Run: `pnpm install && pnpm --filter @intinn/bot test`
  - Expected: FAIL, because `parseEnv` is not defined.

- [ ] **Step 7: Implement `apps/bot/src/env.ts`**
  - A `z.object` schema produces `Env`.
  - `parseEnv` calls `safeParse`. On failure it throws an `Error` whose message lists every issue path, using `z.prettifyError`.
  - `export const env = parseEnv(process.env)`, so the process stops at startup when config is invalid.

- [ ] **Step 8: Run the tests and check they pass**
  - Run: `pnpm --filter @intinn/bot test && pnpm typecheck`
  - Expected: 3 tests pass and `tsc` reports no errors.

- [ ] **Step 9: Commit**

```bash
git add .tool-versions package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json apps/bot
git commit -m "chore: add pnpm workspace, strict TypeScript and validated env"
```

### Task 2: Lint, format and structure gates (`pnpm check`)

**Files:**

- Create: `eslint.config.js`, `.prettierignore`, `knip.json`, `.dependency-cruiser.cjs`, `.jscpd.json`
- Modify: root `package.json` (scripts and root dev dependencies)

**Interfaces:**

- Produces root scripts:
  - `lint: "eslint ."`
  - `format: "prettier --write ."`, `format:check: "prettier --check ."`
  - `knip: "knip"`
  - `depcruise: "depcruise apps/bot/src"`
  - `jscpd: "jscpd"`
  - `check: "pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm knip && pnpm depcruise && pnpm jscpd"`

- [ ] **Step 1: Add root dev dependencies**
  - `eslint@10`, `@eslint/js@10`, `typescript-eslint@8`, `eslint-config-prettier@10`
  - `prettier@3`, `knip@6`, `dependency-cruiser@18`, `jscpd@5`

- [ ] **Step 2: Create `eslint.config.js`**
  - Use `defineConfig` from `eslint/config`. Config order:
    1. `@eslint/js` recommended
    2. `tseslint.configs.strictTypeChecked`
    3. `tseslint.configs.stylisticTypeChecked`
    4. `languageOptions.parserOptions.projectService: true`
    5. `eslint-config-prettier` last
  - Rules:
    - `no-console: "error"`
    - `no-restricted-properties: ["error", { object: "process", property: "env", message: "Read config from apps/bot/src/env.ts" }]`, turned off for `apps/bot/src/env.ts` only
  - Apply `tseslint.configs.disableTypeChecked` to `**/*.{js,cjs}`, so the root config files lint without a tsconfig.
  - Ignores: `**/node_modules/**`, `**/coverage/**`, `apps/bot/src/db/migrations/**`.
- [ ] **Step 3: Prettier**
  - No config file: use Prettier defaults.
  - `.prettierignore` lists `pnpm-lock.yaml` and `apps/bot/src/db/migrations/`.
- [ ] **Step 4: Create `knip.json`**
  - `workspaces["apps/bot"]`: `entry: ["src/main.ts"]`, `project: ["src/**/*.ts"]`.
  - Keep knip's auto-detected plugins (vitest, drizzle).
- [ ] **Step 5: Create `.dependency-cruiser.cjs`**
  - Rules, all with severity `error`:
    - `no-circular`
    - `modules-not-to-http`: from `^apps/bot/src/modules/` to `^apps/bot/src/http/`
    - `shared-not-to-modules`: from `^apps/bot/src/(lib|db|jobs)/` to `^apps/bot/src/modules/`
    - `module-internals-private`: from `^apps/bot/src/modules/([^/]+)/` to `^apps/bot/src/modules/[^/]+/`, with `pathNot` `^apps/bot/src/modules/$1/` and `^apps/bot/src/modules/[^/]+/index\\.ts$`
    - `not-to-unresolvable`
  - Point `options.tsConfig.fileName` at `apps/bot/tsconfig.json`, so `.ts`-extension imports resolve.
- [ ] **Step 6: Create `.jscpd.json`**
  - `pattern: "apps/*/src/**/*.ts"`, `ignore: ["**/*.test.ts", "**/migrations/**"]`
  - `minTokens: 50`, `threshold: 1`, `reporters: ["console"]`, `gitignore: true`
- [ ] **Step 7: Add the scripts listed under Interfaces, then format the repo once**
  - Run: `pnpm format && pnpm check`
  - Expected: every stage exits 0.

- [ ] **Step 8: Prove the gates catch violations, then delete the probe files**
  - Create a probe `apps/bot/src/probe.ts` containing:
    - `console.log(process.env.X)`
    - a floating `Promise.resolve()`
    - an unused `export const unused = 1`
  - Create a probe `apps/bot/src/modules/probe/a.ts` importing a probe `apps/bot/src/http/b.ts`.
  - Run `pnpm lint`. Expected: it fails with `no-console`, `no-restricted-properties` and `@typescript-eslint/no-floating-promises`.
  - Run `pnpm knip`. Expected: it reports the unused file or export.
  - Run `pnpm depcruise`. Expected: it fails with `modules-not-to-http`.
  - Delete all probe files and run `pnpm check`. Expected: it passes.

- [ ] **Step 9: Commit**
  - Add every created file plus `package.json` and `pnpm-lock.yaml`.
  - Run: `git commit -m "chore: add lint, format, dead-code and layer-rule gates"`

### Task 3: Postgres, logger and HTTP app with `/health`

**Files:**

- Create: `docker-compose.yml`, `docker/postgres/init/01-create-test-db.sql`
- Create: `apps/bot/drizzle.config.ts`, `apps/bot/src/db/client.ts`, `apps/bot/src/lib/logger.ts`, `apps/bot/src/http/app.ts`
- Test: `apps/bot/src/http/app.test.ts`

**Interfaces:**

- Consumes: `env` (Task 1).
- Produces:
  - `type Db = NodePgDatabase` and `createDb(connectionString: string): Db` in `db/client.ts`. Close with `db.$client.end()`.
  - `logger: pino.Logger` in `lib/logger.ts`.
  - `type AppDeps = { db: Db }` and `createApp(deps: AppDeps): Hono` in `http/app.ts`. Task 4 widens `AppDeps`.

- [ ] **Step 1: Docker Compose**
  - Service `postgres`, image `postgres:18-alpine`.
  - Environment: `POSTGRES_USER=intinn`, `POSTGRES_PASSWORD=intinn`, `POSTGRES_DB=intinn`.
  - Port `5432:5432`, a named volume, and a `pg_isready` healthcheck.
  - Mount `docker/postgres/init` into `/docker-entrypoint-initdb.d`. The SQL file runs `CREATE DATABASE intinn_test;`.
  - Run: `docker compose up -d --wait`. Expected: the service is healthy. If the Docker daemon is not running, ask the owner to start Docker Desktop.
- [ ] **Step 2: Add dependencies to `@intinn/bot`**
  - Dependencies: `hono@4`, `@hono/node-server@2`, `drizzle-orm@0.45`, `pg@8`, `pino@10`.
  - Dev dependencies: `drizzle-kit@0.31`, `@types/pg@8`, `pino-pretty@13`.
- [ ] **Step 3: Create `drizzle.config.ts`**
  - `dialect: "postgresql"`, `schema: "./src/modules/*/*.schema.ts"`, `out: "./src/db/migrations"`, `casing: "snake_case"`.
  - No `dbCredentials`: `generate` does not need a database.
  - The first table brings the rest: its schema file, a `db:migrate` script, and a Vitest global setup that migrates `intinn_test`. So `db:generate` is not run in this plan.
- [ ] **Step 4: Write the failing tests in `apps/bot/src/http/app.test.ts`**

```ts
test("GET /health reports ok when the database answers", async () => {
  const db = createDb(env.DATABASE_URL);
  const res = await createApp({ db }).request("/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
  await db.$client.end();
});

test("GET /health reports unavailable when the database is down", async () => {
  const db = createDb("postgres://intinn:intinn@localhost:1/intinn");
  const res = await createApp({ db }).request("/health");
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ status: "unavailable" });
  await db.$client.end();
});
```

- [ ] **Step 5: Run the tests and check they fail**
  - Run: `pnpm --filter @intinn/bot test src/http`
  - Expected: FAIL, because `createApp` is not defined.
- [ ] **Step 6: Implement**
  - `createDb` uses `drizzle({ connection: connectionString, casing: 'snake_case' })`.
  - `logger`:
    - `pino({ level: env.LOG_LEVEL })`
    - `redact: ['headers.authorization', 'headers["x-line-signature"]', '*.channelAccessToken', '*.replyToken']`
  - `createApp`:
    - `GET /health` runs `db.execute(sql\`select 1\`)`. On success it returns `{ status: 'ok' }`. On error it logs at `warn`and returns 503`{ status: 'unavailable' }`.
    - `app.onError`: return `err.getResponse()` for an `HTTPException`. Otherwise log at `error` and return 500 `{ status: 'error' }`.
- [ ] **Step 7: Run the tests and `pnpm check`**
  - Run: `pnpm check`
  - Expected: PASS. knip may flag `logger` or `createApp` as unused until `main.ts` exists in Task 5. If so, add `src/http/app.ts` as a temporary entry in `knip.json` and remove it in Task 5.
- [ ] **Step 8: Commit**
  - Run: `git commit -m "feat: add Postgres, logger and HTTP app with health check"`

### Task 4: LINE webhook intake (signature check, enqueue, dedupe)

**Files:**

- Create: `apps/bot/src/jobs/boss.ts`, `apps/bot/src/jobs/queues.ts`
- Create: `apps/bot/src/modules/line-webhook/line-webhook.routes.ts`, `apps/bot/src/modules/line-webhook/line-webhook.jobs.ts`, `apps/bot/src/modules/line-webhook/index.ts`
- Create: `apps/bot/src/modules/line-webhook/line-webhook.fixtures.ts` (test events, imported only by tests)
- Modify: `apps/bot/src/http/app.ts`: mount the routes and widen `AppDeps`
- Modify: `apps/bot/src/http/app.test.ts`: start a `boss` in `beforeAll`, pass `{ db, boss }`, stop it in `afterAll`
- Test: `apps/bot/src/modules/line-webhook/line-webhook.routes.test.ts`

**Interfaces:**

- Consumes: `createApp`, `AppDeps` (Task 3), `env.LINE_CHANNEL_SECRET`.
- Produces:
  - `queues = { lineEvent: 'line.event' } as const` in `jobs/queues.ts`.
  - `startBoss(connectionString: string): Promise<PgBoss>` in `jobs/boss.ts`. It starts pg-boss and calls `createQueue` for every value in `queues`.
  - `type LineEventJob = { event: webhook.Event }` and `enqueueLineEvent(boss: PgBoss, event: webhook.Event): Promise<void>` in `line-webhook.jobs.ts`. The job id is `v5(event.webhookEventId, LINE_EVENT_JOB_NAMESPACE)`. `LINE_EVENT_JOB_NAMESPACE` is a constant UUID generated once with `uuidgen`.
  - `lineWebhookRoutes(deps: { boss: PgBoss }): Hono`, with `POST /`.
  - `AppDeps` becomes `{ db: Db; boss: PgBoss }`. `/webhooks/line` mounts `lineWebhookRoutes`.
  - `index.ts` exports `lineWebhookRoutes`.
  - `textEvent(id: string, text = 'hello'): webhook.MessageEvent` in `line-webhook.fixtures.ts`.

- [ ] **Step 1: Add dependencies**
  - `pg-boss@12`, `@line/bot-sdk@11`, `uuid@14`.
- [ ] **Step 2: Write the failing tests in `line-webhook.routes.test.ts`**
  - Setup:
    - `beforeAll`: start `boss` with `startBoss(env.DATABASE_URL)` and `db` with `createDb`.
    - `beforeEach`: `await boss.deleteAllJobs()`.
    - `afterAll`: stop both.
  - Helpers:
    - `sign(body)`: `createHmac('sha256', env.LINE_CHANNEL_SECRET).update(body).digest('base64')`.
    - `post(body, headers)`: `createApp({ db, boss }).request('/webhooks/line', { method: 'POST', body, headers })`.
    - `queued()`: `boss.fetch<LineEventJob>(queues.lineEvent, { batchSize: 10 })`.
  - The fixture `textEvent(id)` is a `webhook.MessageEvent`. It lives in `line-webhook.fixtures.ts` and has:
    - `webhookEventId: id`, `replyToken: 'reply-token'`
    - `message: { type: 'text', id: 'm1', text: 'hello', quoteToken: 'q' }`
    - the rest of the required fields as in LINE's sample payload

```ts
test("rejects a request without a signature header", async () => {
  const res = await post(
    JSON.stringify({ destination: "U", events: [textEvent("E1")] }),
    {},
  );
  expect(res.status).toBe(401);
  expect(await queued()).toHaveLength(0);
});

test("rejects a bad signature before parsing the body", async () => {
  const res = await post("not json", { "x-line-signature": "bad" });
  expect(res.status).toBe(401);
});

test("accepts the LINE console verify request without enqueuing", async () => {
  const body = JSON.stringify({ destination: "U", events: [] });
  const res = await post(body, { "x-line-signature": sign(body) });
  expect(res.status).toBe(200);
  expect(await queued()).toHaveLength(0);
});

test("enqueues one job per event", async () => {
  const body = JSON.stringify({
    destination: "U",
    events: [textEvent("E1"), textEvent("E2")],
  });
  const res = await post(body, { "x-line-signature": sign(body) });
  expect(res.status).toBe(200);
  expect(
    (await queued()).map((job) => job.data.event.webhookEventId).sort(),
  ).toEqual(["E1", "E2"]);
});

test("enqueues a redelivered event only once", async () => {
  const body = JSON.stringify({ destination: "U", events: [textEvent("E1")] });
  await post(body, { "x-line-signature": sign(body) });
  await post(body, { "x-line-signature": sign(body) });
  expect(await queued()).toHaveLength(1);
});
```

- [ ] **Step 3: Run the tests and check they fail**
  - Run: `pnpm --filter @intinn/bot test src/modules/line-webhook`
  - Expected: FAIL, because the module does not exist.
- [ ] **Step 4: Implement**
  - The route reads the raw body with `c.req.text()`.
  - A missing header or a failed `validateSignature(body, env.LINE_CHANNEL_SECRET, signature)` throws `new HTTPException(401)`.
  - Only after that does the route call `JSON.parse(body) as webhook.CallbackRequest`, then `await enqueueLineEvent(boss, event)` for each event in order, then return `c.body(null, 200)`.
  - pg-boss returns `null` for a duplicate job id. Treat that as success, not as an error.
- [ ] **Step 5: Run the tests and `pnpm check`**
  - Run: `pnpm check`
  - Expected: PASS, including depcruise. The module imports `jobs/` and `lib/`, never `http/`.
- [ ] **Step 6: Commit**
  - Run: `git commit -m "feat: receive LINE webhooks and enqueue events with dedupe"`

### Task 5: Echo worker, process entrypoint and local-dev README

**Files:**

- Create: `apps/bot/src/lib/copy/th.ts`, `apps/bot/src/modules/line-webhook/line-webhook.service.ts`, `apps/bot/src/main.ts`, `README.md`
- Modify: `apps/bot/src/modules/line-webhook/line-webhook.jobs.ts` (worker registration), `apps/bot/src/modules/line-webhook/index.ts`
- Test: `apps/bot/src/modules/line-webhook/line-webhook.service.test.ts`

**Interfaces:**

- Consumes: `LineEventJob`, `queues`, `startBoss`, `createDb`, `createApp`, `logger`, `env`.
- Produces:
  - `th = { echo: (text: string) => string }` in `lib/copy/th.ts`. `th.echo(text)` returns exactly `` `Intinn ได้ยินว่า: ${text}` ``.
  - `type LineReplyClient = Pick<messagingApi.MessagingApiClient, 'replyMessage'>`.
  - `replyToLineEvent(event: webhook.Event, line: LineReplyClient): Promise<void>`.
  - `registerLineEventWorker(boss: PgBoss, line: LineReplyClient): Promise<string>` in `line-webhook.jobs.ts`. It loops over the jobs it receives and calls `replyToLineEvent` for each.
  - `index.ts` also exports `registerLineEventWorker`.

- [ ] **Step 1: Write the failing tests in `line-webhook.service.test.ts`**
  - `fakeLine()` returns `{ client, requests }`. Its `client.replyMessage` pushes each request into `requests` and resolves `{ sentMessages: [] }`.
  - Add `stickerEvent(id)` and `followEvent(id)` to `line-webhook.fixtures.ts`, next to `textEvent`.

```ts
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
```

- [ ] **Step 2: Run the tests and check they fail**
  - Run: `pnpm --filter @intinn/bot test src/modules/line-webhook/line-webhook.service`
  - Expected: FAIL, because `replyToLineEvent` is not defined.
- [ ] **Step 3: Implement `replyToLineEvent`, `th` and `registerLineEventWorker`**
  - `replyToLineEvent` narrows on `event.type === 'message' && event.message.type === 'text'`.
  - Other events are logged at `debug` with `type` and `webhookEventId`.
- [ ] **Step 4: Run the tests and check they pass**
  - Run: `pnpm --filter @intinn/bot test`
  - Expected: all tests pass.
- [ ] **Step 5: Implement `apps/bot/src/main.ts`**
  1. `createDb(env.DATABASE_URL)`
  2. `await startBoss(env.DATABASE_URL)`
  3. `new messagingApi.MessagingApiClient({ channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN })`
  4. `await registerLineEventWorker(boss, line)`
  5. `serve({ fetch: createApp({ db, boss }).fetch, port: env.PORT })`
  6. Log `listening` with the port.
  - On `SIGINT` or `SIGTERM`: close the server, then `await boss.stop()`, then `await db.$client.end()`.
  - Remove any temporary knip entry added in Task 3.
- [ ] **Step 6: Smoke-test the running process**
  - Run: `cp apps/bot/.env.example apps/bot/.env`. Fill the two LINE keys with placeholder text; real values come from the owner later. Then run `pnpm dev`.
  - Check: `curl -s localhost:3000/health` prints `{"status":"ok"}`.
  - Check: `curl -s -o /dev/null -w '%{http_code}' -X POST localhost:3000/webhooks/line -d '{}'` prints `401`.
  - Stop the process with Ctrl-C. Expected: it exits cleanly within 5 s.
  - Never print `.env`.
- [ ] **Step 7: Write `README.md`**
  - What Intinn is (2 lines), plus links to the spec and `CLAUDE.md`.
  - **Prerequisites:**
    - asdf Node 26.13.0
    - `npm i -g pnpm@12.16.1`
    - Docker Desktop
    - `brew install gitleaks cloudflared`
  - **Setup:** `pnpm install`, `docker compose up -d --wait`, `cp apps/bot/.env.example apps/bot/.env`.
  - **Run and check:** `pnpm dev`, `pnpm check`.
  - **Connect a LINE channel:**
    1. Create provider "Intinn". Keep every future channel under it.
    2. Create a Messaging API channel and put its channel secret and access token in `.env`.
    3. In LINE Official Account Manager, turn off auto-reply and greeting messages.
    4. Run `cloudflared tunnel --url http://localhost:3000` and set the webhook URL to `<tunnel>/webhooks/line`.
    5. Turn on "Use webhook" and press "Verify".
- [ ] **Step 8: Run `pnpm check`, then commit**
  - Run: `git commit -m "feat: reply to LINE text messages with an echo; add entrypoint and README"`

### Task 6: Claude Code setup

**Files:**

- Create: `CLAUDE.md`
- Create: `.claude/settings.json`, `.claude/hooks/format-file.sh`, `.claude/hooks/typecheck-on-stop.sh`, `.claude/hooks/protect-files.sh`, `.claude/hooks/guard-main.sh`
- Create: `.claude/rules/line.md`, `.claude/rules/db.md`, `.claude/rules/testing.md`, `.claude/rules/prompts.md`
- Create: `.claude/agents/reviewer.md`, `.mcp.json`

**Interfaces:**

- Hook scripts read the hook JSON from stdin with `jq`.
- Exit 2 with a one-line reason on stderr blocks the action. Exit 0 allows it.

- [ ] **Step 1: Read the current Claude Code docs before writing config**
  - Read the docs for hooks, settings permissions, memory/rules (`paths:` frontmatter), subagents and plugins at `https://code.claude.com/docs`.
  - Confirm three things: the permission-rule syntax for Bash wildcards, the `stop_hook_active` field, and the exact plugin id for `security-guidance`.
- [ ] **Step 2: Write the hook scripts** (make them executable with `chmod +x`)
  - `format-file.sh` (PostToolUse on `Edit|Write|MultiEdit`):
    - Run `pnpm exec prettier --write --ignore-unknown "$file"`.
    - For a `.ts` or `.js` file, also run `pnpm exec eslint --fix "$file"`.
    - If ESLint still reports errors, print them to stderr and exit 2, so Claude sees them.
  - `typecheck-on-stop.sh` (Stop):
    - If `stop_hook_active` is true, exit 0, to prevent loops.
    - Otherwise run `pnpm -s typecheck 1>&2 || exit 2`.
  - `protect-files.sh` (PreToolUse on `Edit|Write|MultiEdit`):
    - Block a path whose basename is `.env`.
    - Block a path under `apps/bot/src/db/migrations/` that `git ls-files --error-unmatch` reports as tracked, because it is already applied.
  - `guard-main.sh` (PreToolUse on `Bash`):
    - Block a command containing `git commit` when `git branch --show-current` is `main`.
    - Block a command containing `git push` that names `main` as the target, or that has no refspec while the current branch is `main`.
- [ ] **Step 3: Check each hook by piping sample JSON into it**
  - `echo '{"tool_input":{"file_path":"apps/bot/.env"}}' | .claude/hooks/protect-files.sh; echo $?` prints `2`.
  - The same check with `apps/bot/.env.example` prints `0`.
  - On branch `chore/project-setup`, `echo '{"tool_input":{"command":"git push origin main"}}' | .claude/hooks/guard-main.sh; echo $?` prints `2`.
  - `git push origin chore/project-setup` prints `0`.
  - `git commit -m x` prints `0` on this branch.
  - Write a badly formatted `apps/bot/src/probe.ts`, then pipe `{"tool_input":{"file_path":"apps/bot/src/probe.ts"}}` into `format-file.sh`. Expected: the file comes back Prettier-formatted. Delete the probe.
  - Run `echo '{"stop_hook_active":false}' | .claude/hooks/typecheck-on-stop.sh; echo $?`. Expected: `0` while the tree type-checks.
- [ ] **Step 4: Write `.claude/settings.json`**
  - Permissions:
    - `allow`: `pnpm check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format`, `pnpm knip`, `pnpm depcruise`, `pnpm jscpd`, `pnpm --filter @intinn/bot` scripts, and read-only `git status`, `git diff`, `git log`, `git show`, `git branch`.
    - `ask`: `git push`.
    - `deny`: `Read` of `**/.env`, plus Bash commands that print `.env` (`cat`, `head`, `tail`, `less`, `grep` on `.env`).
  - The four hooks from Step 2.
  - Enable the `security-guidance` plugin.
- [ ] **Step 5: Write the `.claude/rules/*.md` files**
  - Each file has `paths:` frontmatter and at most about 25 lines.
  - `line.md` (paths: `apps/bot/src/modules/line-*/**`):
    - Check the signature on the raw body before parsing.
    - Answer within 2 s by enqueuing work.
    - Dedupe through the UUIDv5 job id.
    - A reply token is single use and valid for about 1 minute.
    - Prefer replies to pushes: pushes cost money.
    - SDK types are the source of truth for LINE payloads.
    - Keep all channels under provider "Intinn".
  - `db.md` (paths: `apps/bot/src/db/**`, `apps/bot/src/modules/**/*.schema.ts`, `apps/bot/src/modules/**/*.repo.ts`):
    - Tables live in `<feature>.schema.ts`. Queries live only in `<feature>.repo.ts`.
    - Generate migrations with `pnpm --filter @intinn/bot db:generate`. Never edit a committed migration.
    - Use `timestamptz` in UTC. Columns are snake_case through `casing`.
  - `testing.md` (paths: `**/*.test.ts`):
    - Test behavior, not implementation.
    - Use real Postgres `intinn_test`.
    - Fake external clients through `Pick<>` types.
    - Never `vi.mock` our own modules.
    - Test names state the behavior.
  - `prompts.md` (paths: `**/*.prompts.ts`):
    - Prompts are typed builder functions in the owning module.
    - Parse structured output with Zod (`messages.parse`).
    - Pass the user's locale.
    - Prompts never live outside the repo.
- [ ] **Step 6: Write `CLAUDE.md`** (under 150 lines)
  - What Intinn is (3 lines), and a pointer to the spec.
  - Exact commands from the README.
  - A structure map of the layout as built.
  - The Global Constraints of this plan, rephrased as rules.
  - How to add a feature: copy the shape of `modules/line-webhook`, and expose only `index.ts`.
  - Workflow:
    - Work on a branch and open a PR. Never commit to `main`.
    - Run `pnpm check` before opening a PR.
    - A new dependency needs a reason in the PR description.
    - Non-obvious decisions go in `docs/decisions/NNNN-title.md`.
  - "Known surprises":
    - TS 6, not 7, and why.
    - `.ts` import extensions.
    - pg-boss queues must be created in `startBoss`.
    - The LINE 2 s limit.
- [ ] **Step 7: Write `.claude/agents/reviewer.md`**
  - Frontmatter: `name: reviewer`, a one-line `description`, `tools: Read, Grep, Glob`.
  - The body is a checklist:
    - correctness
    - security: signature check, secrets in logs, injection, authz
    - adherence to `CLAUDE.md` and the rules files
    - reuse: grep for an existing helper before accepting a new one
    - slop: dead code, narrating comments, speculative options, duplicate patterns
  - It skips formatting and style.
  - Output: findings as `file:line — problem — why it matters`, most severe first, or "no findings".
- [ ] **Step 8: Write `.mcp.json`**
  - `{"mcpServers":{"context7":{"command":"npx","args":["-y","@upstash/context7-mcp@4.4.4"]}}}`, after re-checking the latest version.
- [ ] **Step 9: Run `pnpm check`, then commit**
  - Run: `git commit -m "chore: add Claude Code settings, hooks, rules, reviewer agent and MCP config"`

### Task 7: Git hooks, CI, Claude PR review and Dependabot

**Files:**

- Create: `lefthook.yml`, `.github/workflows/ci.yml`, `.github/workflows/claude-review.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md`
- Modify: root `package.json`: add `lefthook@2` as a dev dependency, a `prepare: "lefthook install"` script, and `lefthook` in `onlyBuiltDependencies` if pnpm asks

- [ ] **Step 1: Write `lefthook.yml`**
  - The `pre-commit` commands run in parallel:
    - `format`: glob `*.{ts,js,json,md,yml,yaml}`, `pnpm exec prettier --write {staged_files}`, `stage_fixed: true`
    - `lint`: glob `*.{ts,js}`, `pnpm exec eslint --fix {staged_files}`, `stage_fixed: true`
    - `secrets`: the gitleaks staged-scan command for the installed version (check `gitleaks --help`), with redaction on
  - Run: `brew install gitleaks && pnpm install`. Expected: `lefthook install` runs and `.git/hooks/pre-commit` exists.
- [ ] **Step 2: Prove pre-commit blocks a secret**
  - Write a probe file containing `ghp_` followed by 36 random alphanumerics, stage it, and try to commit.
  - Expected: gitleaks blocks the commit.
  - Unstage and delete the probe.
- [ ] **Step 3: Write `.github/workflows/ci.yml`**
  - Triggers: `pull_request`, and `push` to `main`. `permissions: contents: read`.
  - Job `check`:
    - Runs on `ubuntu-latest`.
    - Service `postgres:18-alpine` with `POSTGRES_USER=intinn`, `POSTGRES_PASSWORD=intinn`, `POSTGRES_DB=intinn_test`, port 5432 and a `pg_isready` health option.
    - Steps:
      1. `actions/checkout`
      2. `pnpm/action-setup`, which reads `packageManager`
      3. `actions/setup-node` with `node-version-file: .tool-versions` and `cache: pnpm`
      4. `pnpm install --frozen-lockfile`
      5. `pnpm check`
  - Job `secrets`: `actions/checkout` with `fetch-depth: 0`, then `gitleaks/gitleaks-action@v2`.
  - Pin every third-party action to a full commit SHA, with the version tag in a trailing comment.
- [ ] **Step 4: Write `.github/workflows/claude-review.yml`**
  - Triggers:
    - `pull_request`, types `opened`, `reopened` and `ready_for_review`. Run the job only when the PR is not a draft and `github.event.pull_request.head.repo.full_name == github.repository`.
    - `issue_comment` events on PRs whose body contains `@claude review` and whose `author_association` is `OWNER`.
  - Never use `pull_request_target`.
  - Permissions: `contents: read`, `pull-requests: write`, `issues: write`, `id-token: write`.
  - Step: `anthropics/claude-code-action@v1`, pinned to a SHA, with `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}`.
    - Configure it, following the action's current README, to run the code review and then the security review, and post findings as PR comments.
  - The workflow is advisory: no other job depends on it.
- [ ] **Step 5: Write `.github/dependabot.yml`**
  - Ecosystems `npm` (directory `/`) and `github-actions`, both weekly with `cooldown.default-days: 3`.
  - Group all minor and patch npm updates into one PR.
- [ ] **Step 6: Write `.github/pull_request_template.md`**
  - Sections: Summary, Why, New dependencies (name and reason, or "none"), How tested.
  - Checkbox: "`pnpm check` passes".
- [ ] **Step 7: Run `pnpm check`, then commit**
  - Expected: `pnpm check` passes.
  - Run: `git commit -m "ci: add pre-commit hooks, CI, Claude PR review and Dependabot"`

### Task 8: Publish and verify end to end

- [ ] **Step 1: Ask the owner before pushing, then push the branch and open the PR**
  - Run: `git push -u origin chore/project-setup`
  - Open the PR: `gh pr create --base main --title "chore: project foundation" --body-file <filled PR template>`
- [ ] **Step 2: Owner adds the review secret**
  - Ask the owner to run `claude setup-token`, then `gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo spik3s/intinn`.
  - Claude never sees the token.
- [ ] **Step 3: Verify CI**
  - Run: `gh pr checks`
  - Expected: `check` and `secrets` pass.
- [ ] **Step 4: Verify Claude review**
  - Expected: a Claude review comment on the PR.
  - If the action refuses because the workflow file is not on `main` yet, record that in the PR. It is verified on the first PR after merge (spec §7.6).
- [ ] **Step 5: Owner merges the PR**
  - Success criterion 5 (a real LINE echo) is done later by the owner, following the README.

## Final self-review gate (before Task 8)

- [ ] Every spec success criterion (§8) maps to a passing command or a recorded owner step.
- [ ] `git diff main...HEAD` contains no probe files, no debug output, no narrating comments, and no unused exports (knip is green).
- [ ] Naming matches the conventions: `<feature>.<role>.ts`, kebab-case, `.ts` imports.
- [ ] `CLAUDE.md` describes the repo as built, not as planned.
- [ ] A fresh reviewer, using `.claude/agents/reviewer.md`, reads the whole branch diff, and its findings are fixed or answered.
