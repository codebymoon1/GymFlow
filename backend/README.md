# GymFlow Backend

The backend is an Express 5 and TypeScript service using Prisma 7 with the PostgreSQL driver adapter. Authentication is implemented in the backend; the existing frontend remains localStorage-based and has not been connected to the auth API.

## Requirements

- Node.js 26 (the current scripts use Node's built-in TypeScript type stripping)
- npm
- PostgreSQL reachable through a privately configured connection URL

## Local setup

Run these commands from this `backend` directory:

```powershell
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run auth:secret:local
```

Edit the local `.env` file and provide a PostgreSQL URL for the database you intend to use. Do not commit `.env`, put credentials in source code, or print the URL in logs. The repository ignores `.env` and other `.env.*` files while keeping `.env.example` tracked.

Configuration:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | HTTP listening port (1–65535) |
| `HOST` | `127.0.0.1` | Listening interface; set deliberately for deployment |
| `NODE_ENV` | `development` | Enables production-only HTTPS security headers when set to `production` |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed frontend origins |
| `ACCESS_TOKEN_SECRET` | required | Secret used to sign access tokens; generate a different random value for each environment |
| `DATABASE_URL` | unset | PostgreSQL URL; database routes return unavailable if it is unset |

## Run and verify

```powershell
npm run dev
```

The server listens on `http://127.0.0.1:3001` by default. `npm start` runs it without watch mode. Available checks:

```powershell
npm run typecheck
npm test
npm run db:generate
npm run db:check
npm run db:status
npx prisma format
npx prisma validate
```

`db:check`, `db:status`, and database readiness endpoints use `DATABASE_URL` directly; confirm the destination before using them. Never point tests at `gymflow_saas`. Authentication migration and test commands use `scripts/with-test-db.mjs`, which rewrites the URL to `gymflow_test`, verifies `current_database()`, and passes only that URL to Prisma or the test runner:

```powershell
npm run db:test:status
npm run db:test:deploy
npm test
```

No database operation is run automatically when the HTTP server starts.

## Health and API versioning

- `GET /health` and `GET /health/live`: process liveness without a database query.
- `GET /health/db`: backward-compatible database readiness check.
- `GET /api/v1/health/live`: versioned liveness endpoint.
- `GET /api/v1/health/ready`: versioned database readiness check.
- Other unknown paths return a structured 404 response.

Every request gets an `X-Request-Id`. Request logs contain method, path, response status, duration, and request ID; they omit query strings, headers, bodies, credentials, and personal data. Error responses use a stable code/message envelope and do not expose internal exception details. JSON request bodies are limited to 100 KB. Request body schemas can be attached through the reusable `validateBody` middleware.

CORS allows credentials only for explicitly configured origins. Security headers are applied to all responses; HSTS is emitted only in production. Login and refresh routes have per-process rate limits; horizontally scaled deployments need a shared rate-limit store.

## Authentication

Phase 3 adds these endpoints:

- `POST /api/v1/auth/login` accepts an email and password. Email is trimmed/lowercased before lookup. The response returns a short-lived access token; the opaque refresh token is set only in an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/v1/auth` (with `Secure` in production).
- `POST /api/v1/auth/refresh` rotates the refresh token. Send the cookie and an allowed `Origin`. Reuse of a rotated token revokes every still-active session in that token family.
- `POST /api/v1/auth/logout` revokes the presented refresh session and clears the cookie.
- `POST /api/v1/auth/logout-all` revokes the authenticated user's active sessions.
- `GET /api/v1/auth/me` returns the authenticated global user.
- `GET /api/v1/auth/sessions` lists only that user's active session metadata; `DELETE /api/v1/auth/sessions/:sessionId` revokes only a session owned by that user.

Passwords use Argon2id. Refresh tokens are random 256-bit values; only their SHA-256 hashes are stored. Access tokens are HS256-signed, expire after ten minutes, and identify a global user and session only. Authentication middleware checks the current user status and session revocation state in PostgreSQL, so logout and account suspension invalidate access immediately. Error messages do not reveal whether a user exists or is suspended.

Authentication is intentionally separate from gym authorization. No token contains a trusted `gymId` or role. A successful login does not grant membership in any gym; later tenant middleware must derive an authorized gym from `GymUser` and scope every tenant-owned query.

`ACCESS_TOKEN_SECRET` is mandatory and must be a unique random secret of at least 32 bytes. `npm run auth:secret:local` adds a local random secret to the ignored `.env` without displaying it. Use a secret manager for deployed environments; do not reuse the local key.

## Database architecture

Phase 1's 15-model Prisma architecture and initial PostgreSQL migration were applied and verified against the isolated `gymflow_test` database as recorded in the project handoff. Phase 3 adds the `AuthSession` model as a 16th model in a separate additive migration. Keep that database and its fixtures for regression testing. Do not reset it, and do not test against `gymflow_saas`. The original initial migration is unchanged. Existing custom PostgreSQL constraints and triggers for financial ledger integrity, cash-session movements, attendance rules, and immutable audit history remain intact.

The schema includes `Gym`, `User`, `GymUser`, `Member`, `MembershipPlan`, `Shift`, `Attendance`, `Wallet`, `Transaction`, `Payment`, `Expense`, `CashSession`, `CashSessionMovement`, `GymSettings`, `AuditLog`, and `AuthSession`. `GymUser` stores per-gym roles; operational relations use tenant-scoped composite keys. The database design is not a substitute for API tenant authorization: authenticated routes must derive `gymId` from the active user's authorized `GymUser`, check permissions, and scope every database read/write to that tenant. Never treat client-supplied `gymId` as authority. RLS remains disabled until request authentication and transaction-bound tenant context are implemented and tested.

Financial transactions are the ledger source of truth. Cash wallet legs are represented by `CashSessionMovement`; cash-to-cash transfers need movements for both sessions, with reversals posted in currently open sessions. Use database transactions for ledger rows, required cash movements, domain details, and audit entries together. Member roll numbers must use an atomic per-gym counter update and member insert in one transaction.

## Backend structure

```text
src/
  auth/         Argon2id passwords, signed access tokens, refresh sessions, validation
  config/       Environment parsing and validation
  middleware/   Authentication, request context/logging, CORS/security, validation, errors
  routes/       Versioned auth and health routes
scripts/        Local secret setup and test-database safety wrapper
test/           PostgreSQL-backed authentication integration tests
  types/        Express request/response typing
  utils/        Shared errors
  app.ts        Express application composition
  db.ts         Lazy Prisma client lifecycle
  server.ts     HTTP startup and graceful shutdown
```

## Current scope and next phases

Phase 3 provides login, refresh rotation and reuse detection, logout and session revocation, active-account checks, rate limits, and database-backed auth integration tests. It does not implement user registration, password recovery, gym authorization, business APIs, localStorage migration, RLS, automated SaaS billing, or production deployment. Do not add tenant-owned API routes until Phase 4 authorization is implemented.
