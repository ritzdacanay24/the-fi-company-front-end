# Eyefi Modern

Angular workspace for Eyefi operations and quality workflows.

## Local Development

### Frontend
- Run `npm --prefix frontend install`
- Run `npm --prefix frontend run start:local`
- Open `http://localhost:4200`

### Docker Services
- Run `docker compose --env-file backend/.env.development up -d`

### Test Email (Mailpit)
- Start only Mailpit: `docker compose up -d mailpit`
- Open Mailpit inbox UI: `http://localhost:8025`
- Mailpit SMTP listener: `localhost:1025`
- For Nest email testing, use these env values in `backend/.env.development`:
	- `SMTP_HOST=mailpit`
	- `SMTP_PORT=1025`
	- `SMTP_SECURE=false`
- Rebuild/restart Nest after env changes: `docker compose up -d --build nest-api`

## Build

- Run `npm --prefix frontend run build`

## Tests

- Run `npm --prefix frontend run test`

## Single-Server Deploy (Maintenance Mode)

- Script: `backend/scripts/deploy/deploy-with-maintenance.sh`
- Purpose: toggles deploy mode ON/OFF around `systemctl restart` so users see a predictable deployment banner and write requests receive friendly `503 + Retry-After` during rollout.
- Example:
	- `chmod +x backend/scripts/deploy/deploy-with-maintenance.sh`
	- `BACKEND_SERVICE=nest-api FRONTEND_SERVICE=nginx DEPLOY_STATUS_FILE=/var/www/modern/backend/nest-api/deploy-status.json backend/scripts/deploy/deploy-with-maintenance.sh`

- Manual helper (emergency ON/OFF): `backend/scripts/deploy/set-deploy-mode.sh`
	- `chmod +x backend/scripts/deploy/set-deploy-mode.sh`
	- Force ON: `DEPLOY_STATUS_FILE=/var/www/modern/backend/nest-api/deploy-status.json backend/scripts/deploy/set-deploy-mode.sh on`
	- Force OFF: `DEPLOY_STATUS_FILE=/var/www/modern/backend/nest-api/deploy-status.json backend/scripts/deploy/set-deploy-mode.sh off`

## Documentation

- Main documentation index: [docs/README.md](docs/README.md)
- Root notes moved from repo root: [docs/root-notes/README.md](docs/root-notes/README.md)
- Codebase structure map: [docs/codebase-structure.md](docs/codebase-structure.md)

## Codebase Areas

- Frontend (Angular): [frontend/src/](frontend/src)
- Backend (PHP): [backend/](backend)
- Backend (NestJS API): [backend/nest-api/](backend/nest-api)
- Database SQL assets: [backend/database/](backend/database)

## Repository Conventions

- Package manager: use `npm` only.
- Lockfile policy: `frontend/package-lock.json` is the source of truth.
- Environment files:
	- Start local Docker services with `docker compose --env-file backend/.env.development up -d`.
	- Keep secrets in untracked `.env.*` files.
	- Commit only example env files such as `backend/.env.development.example` and `backend/.env.production.example`.
- Documentation conventions:
	- Add new stable docs in `docs/` using lowercase kebab-case file names.
	- Keep legacy migrated root notes in `docs/root-notes/` with original names to preserve history/context.
    