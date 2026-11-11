# GymFlow Backend

The backend is an Express 5 and TypeScript service using Prisma 7 with the PostgreSQL driver adapter. It runs separately from the React/Vite frontend; the frontend package, routes, browser storage, and styles are not changed by this backend foundation.

## Requirements

- Node.js 26 (the current scripts use Node's built-in TypeScript type stripping)
- npm
- PostgreSQL reachable through a privately configured connection URL

## Local setup

Run these commands from this `backend` directory:

```powershell
npm install
Copy-Item .env.example .env
```

Edit the local `.env` file and provide a PostgreSQL URL for the database you intend to use. Do not commit `.env`, put credentials in source code, or print the URL in logs. The repository ignores `.env` and other `.env.*` files while keeping `.env.example` tracked.

Configuration:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | HTTP listening port (1–65535) |
| `HOST` | `127.0.0.1` | Listening interface; set deliberately for deployment |
| `NODE_ENV` | `development` | Enables production-only HTTPS security headers when set to `production` |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed frontend origins |
| `DATABASE_URL` | unset | PostgreSQL URL; database routes return unavailable if it is unset |

## Run and verify

```powershell
npm run dev
```

The server listens on `http://127.0.0.1:3001` by default. `npm start` runs it without watch mode. Available checks:

```powershell
npm run typecheck
npm run db:generate
npm run db:check
npm run db:status
npx prisma format
npx prisma validate
```

`db:check` and the database readiness endpoints execute `SELECT 1` using the configured `DATABASE_URL`. Confirm the intended database before using either. Never point tests at `gymflow_saas`; use the isolated `gymflow_test` database for database verification. No database command is run automatically when the HTTP server starts.

## Health and API versioning

- `GET /health` and `GET /health/live`: process liveness without a database query.
- `GET /health/db`: backward-compatible database readiness check.
- `GET /api/v1/health/live`: versioned liveness endpoint.
- `GET /api/v1/health/ready`: versioned database readiness check.
- Other unknown paths return a structured 404 response.

Every request gets an `X-Request-Id`. Request logs contain method, path, response status, duration, and request ID; they omit query strings, headers, bodies, credentials, and personal data. Error responses use a stable code/message envelope and do not expose internal exception details. JSON request bodies are limited to 100 KB. Request body schemas can be attached through the reusable `validateBody` middleware.

CORS only allows configured origins and does not enable cross-origin credentials. Security headers are applied to all responses; HSTS is emitted only in production. Authentication, authorization, rate limiting, business routes, and request-specific tenant context are later phases and are not represented as complete here.

## Database architecture

Phase 1's 15-model Prisma architecture and initial PostgreSQL migration were applied and verified against the isolated `gymflow_test` database as recorded in the project handoff. Keep that database for regression testing. Do not reset it, and do not test against `gymflow_saas`. The checked-in migration has custom PostgreSQL constraints and triggers for financial ledger integrity, cash-session movements, attendance rules, and immutable audit history. Phase 2 does not alter the Prisma schema, migration, or any database.

The schema includes `Gym`, `User`, `GymUser`, `Member`, `MembershipPlan`, `Shift`, `Attendance`, `Wallet`, `Transaction`, `Payment`, `Expense`, `CashSession`, `CashSessionMovement`, `GymSettings`, and `AuditLog`. `GymUser` stores per-gym roles; operational relations use tenant-scoped composite keys. The database design is not a substitute for API tenant authorization: future authenticated routes must derive `gymId` from the active user's authorized `GymUser`, check permissions, and scope every database read/write to that tenant. Never treat client-supplied `gymId` as authority. RLS remains disabled until request authentication and transaction-bound tenant context are implemented and tested.

Financial transactions are the ledger source of truth. Cash wallet legs are represented by `CashSessionMovement`; cash-to-cash transfers need movements for both sessions, with reversals posted in currently open sessions. Use database transactions for ledger rows, required cash movements, domain details, and audit entries together. Member roll numbers must use an atomic per-gym counter update and member insert in one transaction.

## Backend structure

```text
src/
  config/       Environment parsing and validation
  middleware/   Request context/logging, CORS/security, body validation, errors
  routes/       Versioned API and health routes
  types/        Express request/response typing
  utils/        Shared errors
  app.ts        Express application composition
  db.ts         Lazy Prisma client lifecycle
  server.ts     HTTP startup and graceful shutdown
```

## Current scope and next phases

Phase 2 provides the service foundation, configuration, middleware, typed checks, API versioning, health endpoints, and graceful shutdown. It does not implement login, business APIs, gym registration, localStorage migration, RLS, automated SaaS billing, or production deployment. Proceed to Phase 3 authentication only after this foundation passes its checks; then implement tenant authorization before adding tenant-owned business routes.
