# Deploy QAD API V2 (Side-by-Side)

This deploy keeps legacy PHP APIs running while enabling the new TypeScript API under `ApiV2`.

## 1) Prepare secrets on server

Create `backend/.env.production` from `backend/.env.production.example` and set real credentials.
Ensure `QAD_DRIVER_PATH=/opt1/Progress/DataDirect/Connect64_for_ODBC_71`.

## 2) Start only QAD API V2 in production mode

```bash
docker compose \
  --env-file backend/.env.production \
  -f docker-compose.yml \
  up -d --build qad-api
```

## 3) Verify service health

```bash
docker compose \
  --env-file backend/.env.production \
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
  --env-file backend/.env.development \
  -f docker-compose.yml \
  up -d --build qad-api
```

Create `backend/.env.development` from `backend/.env.development.example` for local defaults.
After first startup, code changes under `backend/qad-api/src` reload automatically; use `docker compose restart qad-api` only if env values change.

## Troubleshooting

### `[odbc] Error connecting to the database` on `/api/WipReport/index` (local)

Symptom:
- API responds with:
  - `{"ok":false,"endpoint":"/api/WipReport/index","error":"[odbc] Error connecting to the database"}`

Most common cause:
- `qad-api` started without `backend/.env.development`, so container falls back to `QAD_USER=change_me` and `QAD_PASSWORD=change_me`.

Fix:

```bash
docker compose \
  --env-file backend/.env.development \
  -f docker-compose.yml \
  up -d --force-recreate qad-api php
```

Verify effective env in container:

```bash
docker exec eyefi-qad-api sh -lc "env | grep -E '^(QAD_|ODBC|DB_)' | sort"
```

Verify connectivity:

```bash
curl http://127.0.0.1:3001/health
curl "http://127.0.0.1:3001/qad/test?sql=select%20top%201%20*%20from%20sod_det"
```

### `SQLSTATE[HY000] ... Errcode: 28 - No space left on device` (server)

Symptom:
- MySQL fails writing temp files under `/tmp` and API/database calls fail.

Cause:
- Root filesystem is full (or near full). This is host-level disk pressure, not always Docker.

Quick checks:

```bash
df -h
docker system df
sudo du -xhd1 / 2>/dev/null | sort -h
sudo du -xhd1 /var 2>/dev/null | sort -h
```

Safe immediate cleanup:

```bash
sudo journalctl --vacuum-time=7d
sudo find /var/log -type f -name "*.log" -size +100M -exec truncate -s 0 {} \;
```

Then identify and clean largest app directories (commonly `/var/www` or backup paths) before restarting services.
