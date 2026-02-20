# Civic Infrastructure Layer (MVP)

Monorepo with:
- `apps/api` — NestJS API (core engine, orchestration, wallet, audit)
- `apps/web` — Next.js web app (resident + admin demo)

## Quick start

1) Install deps

```bash
npm install
```

2) Configure database

```bash
cp apps/api/.env.example apps/api/.env
```

3) Start Postgres (Docker)

```bash
docker compose up -d
```

4) Run migrations

```bash
npm run generate -w @civic/api
npm run migrate -w @civic/api
```

5) Run dev

```bash
npm run dev
```

## Stable web daemon (keeps running after terminal closes)

```bash
npm run web:daemon:start
npm run web:daemon:status
npm run web:daemon:logs
npm run web:daemon:stop
```

`web:daemon:start` runs a production-like server (`build + next start`) for maximum stability.
For hot reload during coding, use:

```bash
npm run dev -w @civic/web
```

`@civic/web` dev now starts via a safe bootstrap script that rotates stale `.next` cache snapshots to avoid chunk-missing runtime errors (for example `Cannot find module './578.js'`).
Dev and production now use separate Next build directories (`.next-dev` / `.next-prod`) to prevent cache collisions.
After startup it also runs an automatic smoke check (`/`, `/wallet`, `/services`, `/civic-card`, `/timeline`) and validates key `/_next/static/*` assets.

If you ever see a blank or unstyled page after crashes, run:

```bash
npm run web:clean
npm run dev -w @civic/web
```

Manual smoke check:

```bash
npm run web:smoke
```

## Share the demo with someone (public link, not localhost)

1) Start web app:

```bash
npm run dev -w @civic/web
```

2) In another terminal start tunnel:

```bash
npm run web:share
```

You will get a URL like `https://something.loca.lt` that can be opened by another person.
Keep both terminals running while sharing.

If `loca.lt` asks for a tunnel password or behaves inconsistently, use password-free sharing:

```bash
npm run web:share:ssh
```

This uses `localhost.run`, prints `Public URL: https://...`, and copies the link to clipboard.

## Stable background run via `screen` (recommended for local demo)

```bash
npm run web:screen:start
npm run web:screen:status
npm run web:screen:logs
npm run web:screen:stop
```

## macOS: auto-restart service (launchd, "set and forget")

```bash
npm run web:service:install
npm run web:service:status
npm run web:service:logs
npm run web:service:stop
npm run web:service:start
```

This installs a user `launchd` agent that automatically restarts the web server if it crashes.

## Web -> API base URL

`apps/web` uses `API_BASE_URL` for server-side requests.
Client-side actions use `NEXT_PUBLIC_API_BASE_URL`.

Default:
- `http://localhost:4000/api`

## Notes
- API currently returns stubbed responses for MVP scaffolding.
- Country configuration lives in `apps/api/src/config/countries` and is loaded dynamically.

## Vercel + Supabase (API)

For Vercel deploy, do not use direct `db.<project-ref>.supabase.co:5432` unless your project has IPv4 add-on.
Use Supavisor pooler URLs from Supabase -> Project Settings -> Database -> Connection string.

Set API project env vars in Vercel:

- `DATABASE_URL` -> Transaction mode URL (port `6543`) for runtime
- `DIRECT_URL` -> Session mode URL (port `5432`) for Prisma migrations

Build command for API project:

```bash
npm run generate && npx prisma migrate deploy && npm run build
```
# civion
