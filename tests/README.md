# Test Structure

Tests split into two categories:

## Unit Tests (`tests/unit/`)

Service-layer tests with **mocked Prisma** database calls. Fast, isolated, exhaustive logic coverage.

Example: `tests/unit/services/auth.service.test.ts` — mocks `db.users.findUnique`, `db.users.create`, etc.

Run: `bun test:unit`

## Integration Tests (`tests/integration/`)

Route-layer tests with **real SQLite test.db**. Full end-to-end flow via Elysia's `.handle()` method.

Setup: `beforeAll(() => setupTestDb())` / `afterAll(() => teardownTestDb())`

Run: `bun test:integration`

## Adding New Tests

1. **Unit test** — mock Prisma calls at the top:
   ```typescript
   import { mock } from "bun:test";
   mock.module("../../src/models/db", () => ({
     db: {
       users: { findUnique: mock(() => fakeUser) },
     },
   }));
   ```

2. **Integration test** — use real DB:
   ```typescript
   import { setupTestDb, teardownTestDb } from "../helpers/db";
   beforeAll(() => setupTestDb());
   afterAll(() => teardownTestDb());
   ```

## Coverage

Target: **90%** (enforced via `bunfig.toml` → `coverageThreshold = 0.9`)

Run coverage check: `bun test:coverage`
