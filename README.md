# Eyefi Modern

Angular workspace for Eyefi operations and quality workflows.

## Local Development

### Frontend
- Run `npm --prefix frontend install`
- Run `npm --prefix frontend run start:local`
- Open `http://localhost:4200`

### Docker Services
- Run `docker compose --env-file backend/.env.development up -d`

## Build

- Run `npm --prefix frontend run build`

## Tests

- Run `npm --prefix frontend run test`

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
    