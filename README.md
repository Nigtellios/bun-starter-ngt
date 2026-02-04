## Bun Starter NGT (Backend)

Opinionated Bun + Hono backend starter with:
- **Typed routing** via **OpenAPI + Zod**
- **Logging** via **pino** (console + optional file sessions)
- **Rate limiting + request logging + error handling** middleware
- **PostgreSQL** via **pg** + **drizzle-orm**
- **Tests** via `bun test`

---

## Quickstart

### Prerequisites
- **Bun** installed (recommended: latest stable)
- (Optional) **Docker** if you want Postgres locally

### Install

```bash
bun install
```

### Environment variables
Create a local `.env` (Bun automatically loads it) by copying from an example:

```bash
copy .env.development.example .env
```

Key settings live in `src/config/runtimeConfig.ts`.
Two important URL-related settings:
- `HOST`: interface to bind to (default `0.0.0.0`, good for Docker)
- `PUBLIC_BASE_URL`: public URL shown in OpenAPI `servers` (useful behind reverse proxies)

#### Binding (HOST/PORT) vs Public URL (PUBLIC_BASE_URL)
These are **not the same thing**:

- **Where the server listens (bind address)**: `HOST` + `PORT`
  - `HOST=0.0.0.0` means “listen on all interfaces” (normal for Docker/VPS)
  - `HOST=127.0.0.1` means “only local machine” (common when running behind nginx on the same server)
- **What URL clients should use**: `PUBLIC_BASE_URL`
  - This does **not** change where the server binds.
  - It is used to set OpenAPI `servers`, so Swagger UI/docs show the correct public URL.

Typical domain setups:
- **API on a subdomain (cleanest)**: `api.xd.com`
  - `PUBLIC_BASE_URL=https://api.xd.com`
- **API under a path**: `xd.com/api`
  - `PUBLIC_BASE_URL=https://xd.com/api`
  - Your reverse proxy must forward `/api/*` to the Bun app (often stripping the `/api` prefix before proxying).

### Run (dev)

```bash
bun run start
```

By default the app runs at `http://localhost:3137`.

---

## API Docs (OpenAPI + Swagger UI)

In **development** mode (`NODE_ENV=development`) docs are enabled:
- **OpenAPI JSON**: `http://localhost:3137/docs`
- **Swagger UI**: `http://localhost:3137/ui`

Routes register themselves through a registry so the OpenAPI spec and mounted handlers stay in sync:
- Route registry: `src/common/apiRegistry/registry.ts`
- API module imports (important!): `src/api/index.ts`
- OpenAPI bootstrap: `src/init/openAPI.ts`

---

## Scripts

From `package.json`:
- **start**: `bun --watch run src/index.ts`
- **build**: bundles the server to `./dist` (`--target bun`)
- **test**: `bun test`
- **lint**: `biome check src/`
- **check**: `biome check src/ --write`
- **logs:init**: ensures log directory exists
- **logs:prune**: prunes old log sessions (only when `PRESERVE_LOGS=true`)
- **db:seed**: creates table(s) + inserts dummy data if DB is empty

### Git hooks (Husky)
This repo includes hooks:
- `.husky/pre-commit`: runs `bun check`
- `.husky/pre-push`: runs `logs:init`, `logs:prune`, and `build`

If `git push` fails, it usually means the build/lint/test step failed locally—fix that first.

---

## Logging

Logging is configured in `src/common/logging/pino.ts`:
- Always logs to **console** (pretty in dev)
- Optionally writes **session-based JSON log files** when `PRESERVE_LOGS=true`

Related config:
- `LOG_LEVEL` (default `info`)
- `PRESERVE_LOGS` (default `false`)
- `LOG_DIRECTORY` (default `./logs`)
- `LOG_MAX_LINES` (default `1000`)
- `LOG_SESSION_PREFIX` (default `log`)
- `DELETE_LOGS_OLDER_THAN_DAYS` (default `3`)

---

## Security notes (recommended baseline)

This template includes a few security-related defaults (logging, error handling, rate limiting), but **production hardening is mostly about deployment**.

### Reverse proxy + HTTPS (443)
In professional setups the backend is usually:
- exposed on **443** (HTTPS)
- placed behind a **reverse proxy/CDN** (nginx / Traefik / Cloudflare)
- configured so the app itself binds to a private interface (often `HOST=127.0.0.1`) and is not directly reachable from the internet

### Public vs Admin endpoints
- **Public endpoints (A)**: should be protected with **authentication + authorization** (not included in this template yet) and rate limiting.
- **Admin endpoints (C)**: should be protected with **strong auth** + **IP allowlist** (or VPN).

This template includes a protected admin example endpoint:
- `GET /admin/health`

Admin protection uses:
- **Admin API Key**: `Authorization: Bearer <ADMIN_API_KEY>` (or `X-Admin-Api-Key: <ADMIN_API_KEY>`)
- **Optional IP allowlist**: `ADMIN_IP_ALLOWLIST` (comma-separated IPs/CIDRs)

Important notes:
- IP checks rely on reverse proxy headers (`X-Forwarded-For` / `X-Real-Ip`), so set `TRUST_PROXY=true` **only** when you actually run behind a trusted proxy.
- If you set `ADMIN_IP_ALLOWLIST`, requests without a valid client IP header will be blocked.

### Database should not be public
Do not expose Postgres to the internet. Only the backend (same host/network/VPC) should be able to reach it.

### Secrets stay server-side
Keep secrets in env vars (`.env`, container secrets, CI secrets). Never ship them to the frontend.

---

## Database (PostgreSQL)

### Connection
The DB adapter is in `src/init/db.ts` and is **lazy**:
- If **no DB env vars are set**, repositories fall back to in-memory dummy data (useful for quick starts/tests).
- If DB env vars exist, the app uses **Postgres** via a pooled connection.

Configure either:
- **`DATABASE_URL`** (recommended), or
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`

### Schema
Drizzle schema lives in `src/db/schema.ts` (currently includes `users`).

### Migrations (recommended for real projects)
This repo includes **drizzle-kit** migrations. The benefits:
- repeatable schema changes across dev/staging/prod
- CI can create a fresh DB and migrate it deterministically
- seeding can assume the schema exists

Files/folders:
- `drizzle.config.ts`: drizzle-kit configuration
- `drizzle/`: generated SQL migrations + migration journal

Common workflow:
- `bun run db:generate`: generate a new SQL migration from schema changes
- `bun run db:migrate`: apply pending migrations to the configured DB
- `bun run db:seed`: insert dummy data **only if tables are empty**
- `bun run db:setup`: convenience for migrate + seed

### Seed / Dummy data
Run:

```bash
bun run db:seed
```

What it does:
- applies migrations (ensures tables exist)
- checks if table has rows
- inserts 2 dummy users only when empty

---

## Project structure (high-level)

- `src/index.ts`: Bun entry (server config)
- `src/init/app.ts`: Hono app + global middleware + route mounting
- `src/init/openAPI.ts`: OpenAPI router setup + docs toggles
- `src/api/*`: feature modules (routes/controllers/services/repositories)
- `src/common/*`: shared middleware, logging, helpers, response models
- `scripts/*`: maintenance scripts (logs + DB seed)

---

## How to extend

### Add a new endpoint
Recommended pattern for a new feature `foo`:
- create `src/api/foo/router/fooRouter.ts` and register routes via `registerRoute(...)`
- implement handler(s) (controller/service/repository as needed)
- **import the router module** in `src/api/index.ts` so it registers in the OpenAPI registry

### Add middleware
Global middleware is mounted in `src/init/app.ts`. Add new middleware there (or at route-level if it’s feature-specific).

### Add a DB table
- define a new table in `src/db/schema.ts`
- create a repository that uses `getDb()` from `src/init/db.ts`
- update `scripts/seedDb.ts` if you want initial data for the new table

### Add migrations (optional next step)
This template currently keeps things lightweight (schema + seed script).
If you want a more formal workflow, add drizzle-kit config + migrations and run them in CI / on startup.

---

## Monorepo note (frontend/common/backend)
If you later move this into a monorepo, the usual recommendation is:
- keep this project self-contained under e.g. `backend/`
- put **`compose.yaml` at the monorepo root** to orchestrate `frontend + backend + postgres`

---

## License
See `LICENSE`.