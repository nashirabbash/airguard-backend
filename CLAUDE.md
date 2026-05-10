# CLAUDE.md

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
