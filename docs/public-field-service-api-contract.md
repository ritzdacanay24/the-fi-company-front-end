# Public Field Service API Contract

## Goal

Provide a dedicated public API surface for the public request page so anonymous users can:

1. create a request
2. post follow-up comments
3. upload attachments
4. check request status

without exposing internal, permissioned endpoints.

## Security Model

### Separation

1. Public endpoints live under `apiV2/public/field-service/...`.
2. Internal endpoints remain under existing secured modules (`apiV2/request`, `apiV2/request-comments`, `apiV2/attachments`).

### Access Tokens

1. `POST /public/field-service/requests` issues a **request token**.
2. Token is required for comment, attachment, and status endpoints.
3. Store token hashed at rest, with metadata:
   1. `request_id`
   2. `token_hash`
   3. `expires_at`
   4. `revoked_at`
   5. `allowed_actions` (`comment`, `attachment`, `status`)
4. Token can be sent as:
   1. `Authorization: Bearer <token>` (preferred)
   2. query fallback `?token=<token>` during transition only

### Abuse Controls

1. Rate-limit by IP and token.
2. CAPTCHA or Turnstile on create.
3. Strict DTO validation and payload size limits.
4. File extension and MIME allowlist.
5. Attachment malware scanning (async accepted if needed).
6. Audit log for all token-authenticated writes.

## Public Endpoints

### 1) Create Request

`POST /apiV2/public/field-service/requests`

Request body (example):

```json
{
  "customer_name": "Acme Corp",
  "onsite_customer_name": "Jane Doe",
  "onsite_customer_phone_number": "555-555-5555",
  "email": "jane@acme.com",
  "cc_email": ["ops@acme.com"],
  "service_type": "Repair",
  "description": "Display not powering on"
}
```

Response `201`:

```json
{
  "id": 12345,
  "requestId": "FS-12345",
  "token": "<opaque-token>",
  "tokenExpiresAt": "2026-05-24T00:00:00.000Z",
  "message": "Request submitted"
}
```

### 2) Get Request Status (Token Scoped)

`GET /apiV2/public/field-service/requests/{id}/status`

Auth: request token.

Response `200`:

```json
{
  "id": 12345,
  "status": "Pending",
  "created_date": "2026-04-24 19:12:33",
  "request_date": null,
  "start_time": null,
  "published": 0
}
```

### 3) List Comments (Token Scoped)

`GET /apiV2/public/field-service/requests/{id}/comments`

Auth: request token.

Response `200`:

```json
[
  {
    "id": 991,
    "name": "Jane Doe",
    "comment": "Please update arrival window",
    "request_change": 1,
    "created_date": "2026-04-24 20:10:00"
  }
]
```

### 4) Create Comment (Token Scoped)

`POST /apiV2/public/field-service/requests/{id}/comments`

Auth: request token.

Request body:

```json
{
  "name": "Jane Doe",
  "comment": "Can technician call 30 minutes before arrival?",
  "request_change": true
}
```

Response `201`:

```json
{
  "id": 992,
  "message": "Comment submitted"
}
```

### 5) Upload Attachment (Token Scoped)

`POST /apiV2/public/field-service/requests/{id}/attachments`

Auth: request token.
Content type: `multipart/form-data`.

Form fields:

1. `file` (required)
2. `field` (optional, compatibility)
3. `folderName` or `subFolder` (optional, server-normalized)

Response `201`:

```json
{
  "id": 7701,
  "fileName": "site-photo-1.jpg",
  "url": "<public-or-signed-url>",
  "message": "Attachment uploaded"
}
```

### 6) List Attachments (Token Scoped)

`GET /apiV2/public/field-service/requests/{id}/attachments`

Auth: request token.

Response `200`:

```json
[
  {
    "id": 7701,
    "fileName": "site-photo-1.jpg",
    "createdDate": "2026-04-24 20:20:10",
    "url": "<public-or-signed-url>"
  }
]
```

## Error Contract

Standard response shape:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Invalid or expired request token",
  "code": "PUBLIC_TOKEN_INVALID"
}
```

Suggested codes:

1. `PUBLIC_TOKEN_MISSING`
2. `PUBLIC_TOKEN_INVALID`
3. `PUBLIC_TOKEN_EXPIRED`
4. `PUBLIC_ACTION_NOT_ALLOWED`
5. `PUBLIC_RATE_LIMITED`
6. `PUBLIC_FILE_TYPE_NOT_ALLOWED`
7. `PUBLIC_FILE_TOO_LARGE`

## Mapping From Current Frontend Calls

Current calls in `request-public.component.ts`:

1. `requestService.createFieldServiceRequest(...)`
2. `requestService.getByToken(token)`
3. `requestService.getjobByRequestId(request_id)`
4. `commentsService.getByRequestId(request_id)`
5. `commentsService.createComment(token, toEmail, payload)`
6. `attachmentsService.uploadfilePublic(formData)`
7. `attachmentsService.getAttachmentByRequestId(request_id)`

Target replacements:

1. create -> `POST /public/field-service/requests`
2. status -> `GET /public/field-service/requests/{id}/status`
3. list comments -> `GET /public/field-service/requests/{id}/comments`
4. create comment -> `POST /public/field-service/requests/{id}/comments`
5. upload attachment -> `POST /public/field-service/requests/{id}/attachments`
6. list attachments -> `GET /public/field-service/requests/{id}/attachments`

## Rollout Plan

### Phase 1: Add Public Controller and Service

1. New module: `public-field-service`.
2. Mark endpoints `@Public()`.
3. Reuse existing request/comment/attachment services internally where safe.

### Phase 2: Token Guard for Public Follow-Ups

1. Add `PublicRequestTokenGuard` scoped to public follow-up routes.
2. Enforce request-id and token binding.

### Phase 3: Frontend Cutover

1. Switch `request-public.component.ts` calls to new public routes.
2. Keep legacy PHP endpoints as fallback behind feature flag.

### Phase 4: Decommission Legacy Public PHP Endpoints

1. Remove direct calls to `dashboard.eye-fi.com/tasks/...` for public request flow.
2. Keep internal admin/staff APIs unchanged.
