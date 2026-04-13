# Nest API (WIP-first)

This service is the new NestJS backend structure, modeled after the Creorx backend layout.

## Foundation Included

- Global config loading with environment validation
- Request context middleware (`x-request-id` propagation)
- Global HTTP exception filter
- Global request logging interceptor
- Global validation pipe
- Environment-driven CORS

## Scope

- Implemented now: WIP report only
- Legacy backends remain active for all other endpoints

## Endpoints

- GET /health
- GET /api/WipReport/index
- GET /server/ApiV2/WipReport/index

Optional query params:
- limit (max 500)

## Environment

- PORT (default: 3000)
- QAD_DSN
- QAD_USER
- QAD_PASSWORD
- ODBCINI
- ODBCINST
- LD_LIBRARY_PATH

## Run (from repo root)

- docker compose --env-file backend/.env.development up -d nest-api
- curl http://127.0.0.1:3002/health
- curl "http://127.0.0.1:3002/api/WipReport/index?limit=2"
