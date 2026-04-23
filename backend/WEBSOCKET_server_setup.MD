# WebSocket Server Setup (Apache + Nest)

This guide documents how to run WebSockets for dashboard.eye-fi.com when Nest is behind Apache.

## Current application assumptions

- Nest API runs on localhost port 3002
- WebSocket endpoint path in Nest is /api/ws
- Browser connects to:
  - ws://dashboard.eye-fi.com/api/ws (HTTP)
  - wss://dashboard.eye-fi.com/api/ws (HTTPS)

Reference in code:
- backend/nest-api/src/shared/services/unified-websocket.service.ts
- The WebSocket server is created with path: /api/ws

## 1) Enable required Apache modules

Run once:

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel headers rewrite ssl
sudo systemctl reload apache2
```

## 2) Add proxy rules to HTTP vhost

In the active dashboard.eye-fi.com HTTP vhost (commonly dashboard.eye-fi.com.conf), add:

```apache
ProxyPass /api/ws ws://127.0.0.1:3002/api/ws
ProxyPassReverse /api/ws ws://127.0.0.1:3002/api/ws
```

## 3) Add proxy rules to HTTPS vhost

In the active 443 vhost for dashboard.eye-fi.com, add the same lines:

```apache
ProxyPass /api/ws ws://127.0.0.1:3002/api/ws
ProxyPassReverse /api/ws ws://127.0.0.1:3002/api/ws
```

Important:
- If more than one 443 vhost contains ServerAlias dashboard.eye-fi.com, Apache can route requests to the wrong one.
- Use apache2ctl -S to verify which file is the default server for port 443.
- Ensure the selected 443 vhost contains the /api/ws proxy lines.

## 4) Validate and reload Apache

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Expected:
- configtest returns Syntax OK

## 5) Verify WebSocket handshake

### Verify ws on HTTP

```bash
curl -i --max-time 3 \
  -H 'Host: dashboard.eye-fi.com' \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  http://127.0.0.1/api/ws | head -n 20
```

Expected:
- HTTP/1.1 101 Switching Protocols

### Verify wss on HTTPS with SNI

```bash
curl -k -i --max-time 3 --http1.1 \
  --resolve dashboard.eye-fi.com:443:127.0.0.1 \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  https://dashboard.eye-fi.com/api/ws | head -n 20
```

Expected:
- HTTP/1.1 101 Switching Protocols

Notes:
- Using only Host header against https://127.0.0.1 can test the wrong SSL vhost.
- Use --resolve to force proper SNI routing.

## 6) Quick troubleshooting

If browser still logs:
- WebSocket connection to wss://dashboard.eye-fi.com/api/ws failed

Check:

1. Active vhost selection

```bash
sudo apache2ctl -S
```

Confirm the default server on 443 for dashboard.eye-fi.com points to the file you edited.

2. Proxy lines are in enabled configs

```bash
grep -n '/api/ws' /etc/apache2/sites-enabled/*.conf
```

3. Nest is listening on port 3002

```bash
ss -ltnp | grep ':3002'
```

4. Avoid duplicate 443 definitions for the same hostname

If both default-ssl.conf and default-ssl-original.conf define dashboard.eye-fi.com, keep one source of truth.

## 7) Frontend alignment

Frontend must use the same endpoint path and host:
- wss://dashboard.eye-fi.com/api/ws

If frontend hardcodes a different host/path, update frontend environment config and redeploy.
