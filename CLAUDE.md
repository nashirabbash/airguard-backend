# CLAUDE.md

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding

State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First

Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes

Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution

Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Rule 5 — Use the model only for judgment calls

Use me for: classification, drafting, summarization, extraction.
Do NOT use me for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Token budgets are not advisory

Per-task: 4,000 tokens. Per-session: 30,000 tokens.
If approaching budget, summarize and start fresh.
Surface the breach. Do not silently overrun.

## Rule 7 — Surface conflicts, don't average them

If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Rule 8 — Read before you write

Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Rule 9 — Tests verify intent, not just behavior

Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 10 — Checkpoint after every significant step

Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Rule 11 — Match the codebase's conventions, even if you disagree

Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Rule 12 — Fail loud

"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Runtime**: Bun (TypeScript execution environment)
- **Framework**: Elysia (lightweight web framework for Bun)
- **Database**: SQLite via Prisma ORM
- **Schema validation**: Zod
- **Password hashing**: Bun's native `Bun.password.hash/verify` (bcrypt)
- **Token generation**: `crypto.randomUUID()`

## Development Commands

```bash
# Start dev server (hot reload on file changes)
bun run dev

# Run tests (currently placeholder — see issues.md)
bun test
bun test --coverage

# Prisma commands
bunx prisma migrate dev      # Create + apply migration
bunx prisma studio           # Open GUI for database
bunx prisma generate         # Regenerate client types
```

## Architecture

### Three-layer design

**Routes** (`src/routes/`) — HTTP handlers, Elysia decorators, request validation

- `auth.route.ts`: POST /login, /signup, /logout
- `device.route.ts`: POST /register, PUT /:deviceId (device config)
- `telemetry.route.ts`: GET /readings, /export (CSV data retrieval)
- `realtimeData.route.ts`: Sensor ingestion + room status computation

**Services** (`src/services/`) — Business logic, Prisma DB calls, error handling

- `auth.service.ts`: User authentication, token management (static `activeTokens` Map)
- `device.service.ts`: Device registration, config updates
- `telemetry.service.ts`: Sensor reading queries, CSV formatting
- `realtimeData.service.ts`: **Core logic** — room status computation (NORMAL/WARNING/DANGER), token validation

**Models** (`src/models/`)

- `db.ts`: Prisma client singleton (output at `src/generated/prisma/client.ts`)
- `errorMessage.ts`: Shared error constants
- `messageRoute.ts`: Response formatting utilities

### Database schema

**users** — Authentication

- `id, username (unique), password_hash, createdAt, updatedAt, lastLogin`

**deviceConfig** — Device thresholds (per user)

- `deviceId (unique), deviceTokenHash (SHA-256), userId`
- Temperature: `tempUnsafeHigh/Low, tempWarningHigh/Low`
- Humidity: `humidityUnsafeHigh/Low, humidityWarningHigh/Low`
- Air quality: `mq135BaselineRuntimeOnly` (MQ135 sensor baseline)

**sensorReadings** — Telemetry data

- `deviceId, timestamp, temperature, humidity, mq135Value, roomStatus (enum)`

### Room status logic (critical business logic)

In `RealtimeDataService.computeRoomStatus()`:

- **DANGER**: Any value in unsafe zone OR MQ135 >= baseline
  - Temperature: <= `tempUnsafeLow` OR >= `tempUnsafeHigh`
  - Humidity: <= `humidityUnsafeLow` OR >= `humidityUnsafeHigh`
  - MQ135: >= `mq135BaselineRuntimeOnly`
- **WARNING**: Any value in warning zone (only temp/humidity, not MQ135)
  - Temperature: <= `tempWarningLow` OR >= `tempWarningHigh`
  - Humidity: <= `humidityWarningLow` OR >= `humidityWarningHigh`
- **NORMAL**: Everything within normal bounds

DANGER takes priority over WARNING.

### Authentication flow

1. User signs up/logs in → `AuthService.signUp/signIn()` → token = `crypto.randomUUID()` stored in static `activeTokens: Map<token, userId>`
2. Routes extract Bearer token → look up `userId` in `activeTokens`
3. Token revoked on logout or user deleted → removed from `activeTokens` map

**Note**: Token storage is in-memory. Restart = all tokens invalid. Use session store (Redis/DB) for production.

### Device token validation (realtime data ingestion)

1. Device sends raw token in sensor reading message
2. `RealtimeDataService.ingestSensorReading()` hashes token with SHA-256
3. Compare hash against `deviceConfig.deviceTokenHash`
4. If match: compute room status → store reading
5. If mismatch: reject with `DEVICE_TOKEN_INVALID`

## Prisma Setup

Migrations stored in `prisma/migrations/`. Schema lives in `prisma/schema.prisma`.

Custom generator outputs Prisma client to `src/generated/prisma/` (non-standard location to keep generated code out of root).

Database file: `dev.db` (SQLite, .gitignored).

Environment: `DATABASE_URL=file:./dev.db` in `.env`.

## Testing (see issues.md for full plan)

No tests yet. Plan to add:

- **Unit tests** (`tests/unit/`): Service logic with mocked Prisma
- **Integration tests** (`tests/integration/`): Full routes with real test.db
- Coverage target: 90%
- Framework: Bun's built-in `bun test`

Test setup requires helper to manage test database lifecycle (create/wipe before each suite).

## Entry point

`src/index.ts` initializes Elysia, registers all routes under `/api/` prefix, listens on port 3000.
