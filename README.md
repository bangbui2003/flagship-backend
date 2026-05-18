# flagship-backend

REST API server for the Flagship feature flag platform. Built with Fastify 5 and TypeScript.

Handles auth, project/environment management, flag CRUD, targeting rules, user segments, real-time SSE streaming, analytics, webhooks, and background job processing.

## Requirements

- Node.js 20+
- PostgreSQL 15
- Redis 7

## Local setup

```bash
npm install
# set up your .env (see below)
npm run db:migrate
npm run dev
```

Or spin up everything with Docker (from the root):

```bash
docker compose up -d
```

Server listens on `http://localhost:8080`.

## Environment variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/flagship
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this
PORT=8080
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run worker` | Run background event/schedule processor |
| `npm test` | Run test suite (needs DB + Redis) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run build` | Compile TypeScript |

## Project structure

```
src/
├── core/              # Infrastructure: Prisma client, Redis, HTTP utils, logger
├── modules/           # Domain modules, each auto-registered as a Fastify plugin
│   ├── auth/
│   ├── projects/
│   ├── environments/
│   ├── flags/
│   ├── flag-versions/
│   ├── flag-variations/
│   ├── segments/
│   ├── targeting-rules/
│   ├── analytics/
│   ├── webhooks/
│   ├── sdk-config/    # /v1/sdk/config + /v1/sdk/stream (SSE)
│   └── events/        # Event ingestion from SDK clients
└── worker/            # Background processor for events and scheduled tasks
prisma/
└── schema.prisma
```

## API reference

```
GET  /health/ready
POST /v1/auth/register
POST /v1/auth/login
GET  /v1/auth/me

CRUD /v1/projects
CRUD /v1/projects/:id/environments
CRUD /v1/projects/:id/flags
CRUD /v1/projects/:id/segments
CRUD /v1/projects/:id/targeting-rules
CRUD /v1/projects/:id/webhooks
GET  /v1/projects/:id/analytics/overview

GET  /v1/sdk/config    (requires X-API-Key header)
GET  /v1/sdk/stream    (SSE — pushes flag updates in real time)
POST /v1/events        (SDK sends evaluation events here)
```

## License

MIT
