# Backend Workspace

This directory groups all backend runtimes and backend infrastructure.

## Subfolders

- `php/`: primary PHP backend (mounted into the `php` container)
- `qad-api/`: Node/TypeScript QAD API service
- `database/`: backend SQL migrations/views
- `docker/`: backend container Dockerfiles and support files
- `igt_api/`: legacy IGT-related backend artifacts
- `qad-driver/`: local ODBC driver path used by Docker mounts
- `scripts/`: backend-focused deployment/testing/temp scripts

## Run (from repo root)

- `docker compose --env-file backend/.env.local up -d`

## Notes

- Add new PHP backend APIs under `backend/php/api/`.
- Add new QAD TypeScript endpoints under `backend/qad-api/src/`.
