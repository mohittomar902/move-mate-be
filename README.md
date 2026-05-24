# MoveMate

MoveMate is a community-powered ride-sharing and parcel-sharing platform.

This repository starts with a NestJS backend scaffold under `apps/backend`.

## Backend Quick Start

```bash
npm install
npm run prisma:generate
npm run dev:backend
```

Run local infrastructure:

```bash
docker compose -f apps/backend/docker-compose.yml up -d
```

Copy `apps/backend/.env.example` to `apps/backend/.env` before running locally.
