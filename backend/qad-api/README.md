# QAD API (Node/TypeScript)

This service is the TypeScript backend for QAD-focused endpoints and ApiV2 integrations.

## Layout

- `src/`: TypeScript source
- `server.js`: runtime bootstrap entrypoint
- `package.json`: service scripts and dependencies
- `Dockerfile`: container build definition

## Local Runtime

Start from repository root:
- `docker compose --env-file backend/.env.local up -d qad-api`

Useful checks:
- `curl http://127.0.0.1:3001/health`
- `curl "http://127.0.0.1:3001/server/ApiV2/WipReport/index?limit=2"`

## Notes

- Keep QAD/ODBC-specific logic in this service.
- Prefer adding new QAD functionality here instead of expanding legacy PHP pathways.
