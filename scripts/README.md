# Scripts Directory

Utility and operational scripts were moved here from the repository root.

## Ownership

- Mostly backend and operations support.
- A small subset in tools is shared/dev tooling and may touch frontend-generated assets.

## Folders

- `deploy/`: deployment helpers
- `tools/`: local utility scripts
- `testing/`: manual testing helpers and artifacts
- `temp/`: temporary one-off scripts and SQL used during development

## Classification

- Backend-focused:
	- Moved to `backend/scripts/deploy/`
	- Moved to `backend/scripts/testing/test-api.php`
	- Moved to `backend/scripts/temp/`
- Shared or utility (not strictly backend runtime):
	- `tools/convert-logo-to-zpl.py`
	- `tools/parse-menu.js`
	- `tools/update-menu.js`
	- `testing/barcode-test-sheet.html`

## Notes

- Paths in docs have been updated for relocated deployment and API test scripts.
- Runtime source code remains unchanged.
