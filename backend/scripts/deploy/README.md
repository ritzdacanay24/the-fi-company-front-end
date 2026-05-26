# Backend Deploy Runbook (Production Host)

This runbook is for the production server where Nest runs as a single systemd service on port 3002.

- Service: `eyefi-nest-api` (port 3002)

## Normal Release Workflow

Run from repo root:

```bash
cd /var/www/html
./backend/scripts/deploy/deploy-now.sh
```

What this does:
1. Builds/publishes Nest (`publish-nest-zero-downtime.sh`)
2. Prints post-publish status (`publish-status.sh`)

## Verify After Deploy

```bash
cd /var/www/html
./backend/scripts/deploy/publish-status.sh
```

## Emergency Rollback (Routing)

If you need to refresh the ApiV2 single-instance routing:

```bash
cd /var/www/html
./backend/scripts/deploy/rollback-apiv2-to-single-instance.sh
```

## Useful Checks

Service state:

```bash
sudo systemctl status eyefi-nest-api eyefi-nest-api-2 --no-pager -n 30
```

Boot auto-start:

```bash
sudo systemctl is-enabled eyefi-nest-api eyefi-nest-api-2
```

Health endpoints:

```bash
curl -fsS http://127.0.0.1:3002/health
```

## One-Time Setup Notes

- Apache ApiV2 rewrite targets should use `balancer://eyefi_nest_api` only when a balancer is intentionally configured.
- Apache balancer definition is in:
  - `backend/scripts/deploy/templates/apache/eyefi-nest-api-balancer.conf`
- systemd templates are in:
  - `backend/scripts/deploy/templates/systemd/eyefi-nest-api-a.service`
  - `backend/scripts/deploy/templates/systemd/eyefi-nest-api-b.service`

## Development Environment Note

If development uses Docker, do not use this host/systemd runbook there.
Use Docker compose workflow for development deploy/restart.
