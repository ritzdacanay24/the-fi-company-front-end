# Codebase Structure

This repository contains a single product with clearly separated frontend and backend runtimes.

## Frontend (Angular)

Location:
- `frontend/`

Primary config/build files:
- `frontend/angular.json`
- `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.spec.json`
- `frontend/package.json`, `frontend/package-lock.json`

Run:
- `npm --prefix frontend install`
- `npm --prefix frontend run start:local`

Build/Test:
- `npm --prefix frontend run build`
- `npm --prefix frontend run test`

## Backend (PHP API)

Location:
- `backend/php/`

Primary areas:
- `backend/php/api/` modern PHP endpoints
- `backend/php/legacy-api/` legacy endpoints retained for compatibility
- `backend/php/config/` backend configuration and helpers
- `backend/php/database/` backend-side database assets
- `backend/php/uploads/` runtime uploads

Run locally via Docker:
- service: `php` from `docker-compose.yml`
- mount: `./backend/php -> /var/www/html`

## Backend (QAD API, Node/TypeScript)

Location:
- `backend/qad-api/`

Purpose:
- TypeScript API (ApiV2 pathing) for QAD and selected server integrations.

Run locally via Docker:
- service: `qad-api` from `docker-compose.yml`
- command comes from `QAD_API_COMMAND` env (defaults to `npm start`)

## Database and Infrastructure

- `backend/database/` SQL migrations/views used by application features
- `backend/docker/` container Dockerfiles and runtime support files
- `docker-compose.yml` local orchestration for php, mysql, and qad-api
- `backend/qad-driver/` local ODBC driver mount path (ignored in git for local driver files)

## Documentation and Utility Areas

- `docs/` project documentation and runbooks
- `scripts/` deployment/testing/tools/temp utilities

## Practical Boundary Rules

- Frontend code belongs in `frontend/`.
- PHP backend code belongs in `backend/php/`.
- QAD Node/TS backend code belongs in `backend/qad-api/`.
- SQL migrations/views belong in `backend/database/`.
- Do not add application code under `docs/` or `scripts/`.
