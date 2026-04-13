# Documentation Index

This folder contains project documentation and implementation notes.

## Main Sections

- [Root Notes (moved from repo root)](root-notes/README.md)
- [Documentation and repository conventions](conventions.md)
- [Codebase structure](codebase-structure.md)
- Existing topical documentation files in this folder (checklist, serial, workflow, API, and implementation guides)

## Quickstart

- Install dependencies with `npm --prefix frontend install`.
- Run frontend locally with `npm --prefix frontend run start:local`.
- Start local Docker-backed services with:
	- `docker compose --env-file backend/.env.local up -d`
- Keep secrets in local `.env` or `.env.*` files (do not commit secrets).
- Commit only example env files such as `backend/.env.local.example` and `backend/.env.qad-api.example`.

## Why this exists

The repository root is kept focused on source and runtime files, while markdown notes live under the docs tree.
