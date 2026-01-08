# Organization Chart External Sharing Feature

## Overview
This feature allows authenticated users to generate secure, temporary share links for the organization chart that can be sent to external stakeholders (people outside the business). Recipients can view the org chart without needing a full account or login credentials.

## Features

### 1. Secure Token Generation
- **Temporary Access**: Share links automatically expire after a configurable period (1-168 hours, default 24 hours)
- **Password Protection**: Optional password requirement for additional security
- **Unique Tokens**: Each share link uses a cryptographically secure 64-character token
- **Revocation**: Links can be manually revoked before expiration

### 2. Share Link Management
- View all active share links with:
  - Token preview
  - Expiration date/time
  - Access count (number of times viewed)
  - Last accessed timestamp
  - Password protection status
- One-click copy to clipboard
- Revoke access at any time

### 3. Standalone Viewer
- Clean, minimal interface optimized for external viewing
- No authentication wrapper or navigation
- Print functionality
- Export as PNG
- Responsive design for mobile/tablet viewing

## User Guide

### Creating a Share Link

1. **Navigate to Org Chart**: Go to Operations → Organization Chart
2. **Click Share Button**: Click the "Share" button in the toolbar
3. **Configure Options**:
   - Set expiration time (hours)
   - Enable password protection (recommended)
   - Enter and confirm password if enabled
4. **Generate Link**: Click "Generate Share Link"
5. **Copy & Share**: Click "Copy" to copy the URL to clipboard
6. **Share Password**: If password-protected, share the password separately (via email, phone, etc.)

### Managing Active Links

In the Share modal, view all active links:
- See when each link expires
- Track how many times it's been accessed
- Revoke links that are no longer needed

### Best Practices

1. **Use Password Protection**: Always enable passwords for sensitive organizational data
2. **Minimum Expiration**: Use the shortest expiration time necessary (e.g., 24 hours for one-day access)
3. **Separate Communication**: Share passwords through a different channel than the link
4. **Revoke When Done**: Manually revoke links when they're no longer needed
5. **Monitor Access**: Check the access count to see if the link has been used

## Technical Implementation

### Components

#### Frontend Components
- `StandaloneOrgChartComponent`: Standalone viewer component
  - Path: `/standalone/org-chart?token={token}`
  - Features: Token validation, org chart rendering, print/export
  
- `OrgChartShareModalComponent`: Share link generator
  - Modal interface for creating and managing tokens
  - Form validation for passwords
  - Active token list with management controls

#### Backend API
- `backend/api/org-chart-token.php`: Token management API
  - `POST /api/org-chart-token/generate`: Create new token
  - `GET /api/org-chart-token/validate`: Validate token and password
  - `POST /api/org-chart-token/revoke`: Revoke token
  - `GET /api/org-chart-token/list`: List active tokens

#### Database
- `org_chart_tokens` table: Token storage
  - Tracks tokens, expiration, passwords, access stats
  - Automatic cleanup of expired tokens (7 days after expiration)

### Security Features

1. **Token Entropy**: 256-bit random tokens (64 hex characters)
2. **Password Hashing**: BCrypt with default cost factor
3. **Expiration Validation**: Server-side timestamp checking
4. **Revocation Support**: Immediate access denial for revoked tokens
5. **Access Logging**: Tracks view count and last access time
6. **Automatic Cleanup**: Event scheduler removes old tokens

### API Endpoints

#### Generate Token
```http
POST /api/org-chart-token/generate
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "password": "optional_password",
  "expiryHours": 24,
  "userId": 123
}

Response:
{
  "success": true,
  "tokenId": 456,
  "token": "abc123...",
  "shareUrl": "https://example.com/standalone/org-chart?token=abc123...",
  "expiresAt": "2025-01-25 14:30:00",
  "hasPassword": true
}
```

#### Validate Token
```http
GET /api/org-chart-token/validate?token={token}&password={password}

Response (Valid):
{
  "isValid": true,
  "expiresAt": "2025-01-25 14:30:00"
}

Response (Invalid):
{
  "isValid": false,
  "error": "Invalid token"
}

Response (Password Required):
{
  "isValid": false,
  "requiresPassword": true,
  "error": "Password required"
}
```

#### Revoke Token
```http
POST /api/org-chart-token/revoke
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "tokenId": 456
}

Response:
{
  "success": true,
  "message": "Token revoked successfully"
}
```

#### List Active Tokens
```http
GET /api/org-chart-token/list
Authorization: Bearer {jwt_token}

Response:
{
  "tokens": [
    {
      "id": 456,
      "token_preview": "abc123def4...",
      "expires_at": "2025-01-25 14:30:00",
      "access_count": 5,
      "last_accessed_at": "2025-01-24 10:15:00",
      "generated_by": 123,
      "created_at": "2025-01-24 09:00:00",
      "has_password": 1
    }
  ]
}
```

## Database Schema

```sql
CREATE TABLE org_chart_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    generated_by INT DEFAULT NULL,
    access_count INT DEFAULT 0,
    last_accessed_at DATETIME DEFAULT NULL,
    is_revoked TINYINT(1) DEFAULT 0,
    revoked_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_revoked (is_revoked),
    INDEX idx_generated_by (generated_by),
    
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);
```

## Installation

1. **Run Database Migration**:
```bash
mysql -u [username] -p [database] < database/migrations/create_org_chart_tokens_table.sql
```

2. **Verify API Endpoint**: Ensure `backend/api/org-chart-token.php` is accessible

3. **Test Route**: Navigate to `/standalone/org-chart?token=test` to verify routing

4. **Generate First Token**: Use the Share button in the org chart view

## Configuration

### Expiration Limits
Modify in `org-chart-share-modal.component.ts`:
```typescript
expiryHours: [24, [Validators.required, Validators.min(1), Validators.max(168)]]
```

### Automatic Cleanup
The database event runs daily to remove expired tokens. Modify retention period in migration:
```sql
WHERE expires_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
```

### Password Requirements
Modify in `org-chart-share-modal.component.ts`:
```typescript
Validators.minLength(6)  // Change minimum password length
```

## Troubleshooting

### "Invalid or expired access token"
- Token may have expired (check expiration date)
- Token may have been revoked
- Incorrect token in URL
- Database connection issue

### "Password required"
- Link is password-protected
- Implement password prompt UI (future enhancement)

### Chart not rendering
- Check browser console for JavaScript errors
- Verify D3-OrgChart library is loaded
- Check API responses for user/department data

### Token generation fails
- Verify user is authenticated
- Check database permissions
- Ensure `org_chart_tokens` table exists

## Future Enhancements

1. **Password Prompt UI**: Add password input dialog for standalone viewer
2. **Email Integration**: Send share links directly via email from the modal
3. **Usage Analytics**: Track which departments/users are most viewed
4. **Custom Branding**: Allow customization of standalone viewer (logo, colors)
5. **Download Restrictions**: Option to disable print/export features
6. **View-Once Links**: Self-destructing tokens after first access
7. **IP Restrictions**: Limit access to specific IP ranges
8. **Custom Expiration Messages**: Configurable messages for expired links

## Support

For questions or issues, contact the development team or refer to the main application documentation.
