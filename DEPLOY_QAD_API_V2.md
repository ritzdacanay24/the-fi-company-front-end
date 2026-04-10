# Deploy QAD API V2 (Side-by-Side)

This deploy keeps legacy PHP APIs running while enabling the new TypeScript API under `ApiV2`.

## 1) Prepare secrets on server

Create `.env.qad-api` from `.env.qad-api.example` and set real credentials.
Ensure `QAD_DRIVER_PATH=/opt1/Progress/DataDirect/Connect64_for_ODBC_71`.

## 2) Start only QAD API V2 in production mode

```bash
docker compose \
  --env-file .env.qad-api \
  -f docker-compose.yml \
  up -d --build qad-api
```

## 3) Verify service health

```bash
docker compose \
  --env-file .env.qad-api \
  -f docker-compose.yml \
  ps

curl http://127.0.0.1:3001/health
curl "http://127.0.0.1:3001/server/ApiV2/WipReport/index?limit=2"
```

## 4) Reverse proxy path

Map this public path to the container:
- `/server/ApiV2/` -> `http://127.0.0.1:3001/server/ApiV2/`

## 5) Frontend toggle (WIP only)

In production environment config:
- `useApiV2WipReport = false` keeps legacy
- `useApiV2WipReport = true` switches WIP only to V2

## Rollback

Set `useApiV2WipReport = false` and redeploy frontend.

## Local run (auto-reload enabled)

```bash
docker compose \
  --env-file .env.local \
  -f docker-compose.yml \
  up -d --build qad-api
```

Create `.env.local` from `.env.local.example` for local defaults.
After first startup, code changes under `qad-api/src` reload automatically; use `docker compose restart qad-api` only if env values change.
