# Local setup

## Requirements

- Node.js 22 LTS and pnpm 9
- PostgreSQL 16+
- Redis 7, or Memurai on Windows

With Docker, `docker compose up -d` provides all three and creates both databases. Without Docker, follow the steps below.

## 1. PostgreSQL (Windows service)

In pgAdmin or `psql` connected as `postgres`, create a dedicated role and two databases:

```sql
CREATE ROLE chitfund LOGIN PASSWORD 'choose-a-local-password' CREATEDB;
CREATE DATABASE chitfund OWNER chitfund;
CREATE DATABASE chitfund_test OWNER chitfund;
```

`CREATEDB` lets `prisma migrate dev` create its temporary shadow database.

## 2. Redis

Install Memurai Developer (`winget install Memurai.MemuraiDeveloper`). It runs as a Windows service on port 6379.

Use `127.0.0.1`, not `localhost`, in `REDIS_URL`. On Windows, `localhost` can resolve to IPv6, where Memurai does not listen.

## 3. Environment

```
copy .env.example .env
copy .env.test.example .env.test
```

Put the role's password into `DATABASE_URL` in both files. Every setting lives in `.env`; the code has no built-in defaults, so the API and the web dev server refuse to start if a variable is missing. With Docker, `docker compose` also reads the `POSTGRES_*`, `REDIS_PORT` and `MAILPIT_*` values from the same file.

## 4. Install, migrate, create the superadmin

```
pnpm install
pnpm db:migrate
pnpm --filter @chitfund/api db:test:prepare
pnpm --filter @chitfund/api superadmin:create
```

## 5. Run

```
pnpm dev
```

- API: `http://localhost:<PORT>/api/health`. API docs are at `/api/docs` on the same port (development only).
- Web: `http://localhost:<WEB_PORT>`. It calls the API directly at `VITE_API_URL`, and the API allows the origins in `WEB_ORIGIN` through CORS. If you open the web app on another origin, add it to `WEB_ORIGIN`. Unset `VITE_API_URL` to use Vite's same-origin `/api` proxy (`API_PROXY_TARGET`) instead.

`pnpm dev` builds `@chitfund/shared` first, then runs the shared package in watch mode, the API with `nest start --watch`, and Vite, all together.

## Verify

```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Project folder location

The repository currently sits inside a Dropbox-synced folder. Dropbox can lock files in `node_modules` during installs and builds. If installs fail with permission errors, pause syncing or move the project outside Dropbox.
