---
paths:
  - "apps/bot/src/db/**"
  - "apps/bot/src/modules/**/*.schema.ts"
  - "apps/bot/src/modules/**/*.repo.ts"
  - "apps/bot/drizzle.config.ts"
---

# Database

- A feature's tables live in `modules/<feature>/<feature>.schema.ts`. drizzle-kit finds them through `drizzle.config.ts`.
- Queries live only in `<feature>.repo.ts`. Services call repo functions; routes never query.
- Create a migration with `pnpm --filter @intinn/bot db:generate` and commit the generated SQL. Never edit a committed migration (a hook blocks it); generate a new one.
- Column names are snake_case through Drizzle's `casing` option. Write TypeScript names in camelCase.
- Times are `timestamp with time zone` in UTC. Convert to the user's IANA time zone only at the edge.
- The first table also adds a `db:migrate` script and a Vitest global setup that migrates `intinn_test`.
