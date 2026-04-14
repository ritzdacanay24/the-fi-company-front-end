# Backend Workspace

This directory groups all backend runtimes and backend infrastructure.

## Subfolders

- `php/`: legacy PHP backend (mounted into the `php` container)
- `nest-api/`: new NestJS backend service (WIP implemented first)
- `database/`: backend SQL migrations/views
- `docker/`: backend container Dockerfiles and support files
- `igt_api/`: legacy IGT-related backend artifacts
- `qad-driver/`: local ODBC driver path used by Docker mounts
- `scripts/`: backend-focused deployment/testing/temp scripts

## Run (from repo root)

- `docker compose --env-file backend/.env.development up -d`

## Test Email (Mailpit)

- Start Mailpit only: `docker compose up -d mailpit`
- Inbox UI: `http://localhost:8025`
- SMTP target for local testing:
	- `SMTP_HOST=mailpit`
	- `SMTP_PORT=1025`
	- `SMTP_SECURE=false`
- After changing SMTP env values, restart Nest:
	- `docker compose up -d --build nest-api`

## Notes

- Keep `php/` as legacy runtime path while features are migrated.
- Add all new backend features to `backend/nest-api/src/nest/modules/`.
- Current Nest migration scope includes WIP and vehicle modules.
