# Test Structure

Tests split into two categories:
Tests are organized by five categories:

## Unit Tests (`tests/unit/`)

Service-layer tests with **mocked Prisma** database calls. Fast, isolated, exhaustive logic coverage.

Example: `tests/unit/services/auth.service.test.ts` — mocks `db.users.findUnique`, `db.users.create`, etc.

Run: `bun test:unit`

## Integration Tests (`tests/integration/`)

Route-layer tests with **real SQLite test.db**. Full end-to-end flow via Elysia's `.handle()` method.

Setup: `beforeAll(() => setupTestDb())` / `afterAll(() => teardownTestDb())`

Run: `bun test:integration`

## E2E Tests (`tests/e2e/`)

API workflow tests that chain multiple modules in one scenario (e.g. auth + device flow).

Run: `bun test:e2e`

## System Tests (`tests/system/`)

System-level contract checks across API surface (health + validation behavior).

Run: `bun test:system`

## Performance Tests (`tests/performance/`)

Basic latency guardrails for critical endpoints. Thresholds are intentionally loose for local/CI variance.

Run: `bun test:performance`

## Run Everything (Interactive Output)

Run all categories with Bun's `spec` reporter in one command:

`bun run test:all`

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
