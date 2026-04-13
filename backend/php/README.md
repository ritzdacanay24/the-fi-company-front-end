# Backend (PHP)

This folder contains the main PHP backend used by the local `php` container service.

## Layout

- `api/`: primary API endpoints
- `legacy-api/`: legacy endpoints retained for compatibility
- `config/`: shared configuration/utilities
- `database/`: backend-side SQL and related artifacts
- `scripts/`: backend utility scripts
- `uploads/`: runtime upload data

## Local Runtime

Docker mount from repository root:
- `./backend/php` -> `/var/www/html`

Start via root compose file:
- `docker compose --env-file backend/.env.development up -d php mysql`

## Notes

- Keep new backend PHP APIs under `api/`.
- Keep compatibility fixes for older routes under `legacy-api/` only when required.
