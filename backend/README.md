# Backend Workspace

This directory groups all backend runtimes and backend infrastructure.

## Subfolders

- `php/`: legacy PHP backend (mounted into the `php` container)
- `qad-api/`: legacy Node/TypeScript QAD API service
- `nest-api/`: new NestJS backend service (WIP implemented first)
- `database/`: backend SQL migrations/views
- `docker/`: backend container Dockerfiles and support files
- `igt_api/`: legacy IGT-related backend artifacts
- `qad-driver/`: local ODBC driver path used by Docker mounts
- `scripts/`: backend-focused deployment/testing/temp scripts

## Run (from repo root)

- `docker compose --env-file backend/.env.development up -d`

## Notes

- Keep `php/` and `qad-api/` as legacy runtime paths while features are migrated.
- Add all new backend features to `backend/nest-api/src/nest/modules/`.
- Current Nest migration scope: WIP report endpoint only.
