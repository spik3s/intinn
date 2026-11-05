---
paths:
  - "**/*.test.ts"
  - "**/*.fixtures.ts"
---

# Tests

- Test behavior a caller can observe: responses, stored rows, queued jobs, requests sent to a fake client. Never assert that an internal function was called.
- Integration tests use the real Postgres database `intinn_test` (Docker Compose locally, a service container in CI). Never mock the database.
- Fake external services (LINE, Anthropic) at the client boundary with a `Pick<Client, "method">` type that records requests. Never `vi.mock` our own modules.
- Shared test data lives in `<feature>.fixtures.ts` next to the tests.
- Module tests don't import `http/`. Test routes through `<feature>Routes(deps).request(...)`.
- A test name states the behavior: "enqueues a redelivered event only once", not "works".
- Write the test first and watch it fail before writing the code.
