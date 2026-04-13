# Documentation and Repository Conventions

This file defines lightweight standards for consistency across local development and future cleanup passes.

## Package Manager and Lockfile

- Use `npm` for install, build, and scripts.
- The canonical lockfile is `frontend/package-lock.json`.
- Do not add or regenerate `yarn.lock`.

## Environment Files

- Local Docker workflows should use:
  - `docker compose --env-file backend/.env.local up -d`
- Keep secrets in untracked `.env` and `.env.*` files.
- Commit only safe examples:
  - `backend/.env.local.example`
  - `backend/.env.qad-api.example`

## Documentation Naming

- New durable docs in `docs/` should use lowercase kebab-case file names.
- Migrated historical notes remain in `docs/root-notes/` with original names to preserve traceability.
- Prefer concise titles and include a short purpose section near the top.

## Root Hygiene

- Keep repository root focused on runtime/build/config essentials.
- Put operational helpers under `scripts/` and update references when files move.
- Put project notes and implementation writeups under `docs/`.
