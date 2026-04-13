# Field Service Audit Log

## Overview
The Field Service audit log tracks all changes made to field service jobs and team assignments. This provides accountability and a complete history of modifications.

## Database Setup

Run the SQL script to create the audit table:
```bash
mysql -u [username] -p [database] < server/Api/FieldServiceMobile/sql/create_fs_audit_log.sql
```

## What Gets Tracked

All field service operations are now tracked with complete audit trails:

### Job Operations
- **job/create.php**: New job creation with initial team setup
- **job/updateById.php**: Job updates and team reassignments
- **job/deleteById.php**: Job deletion including team removal

### Team Operations (team/*.php)
- **create.php**: New team member assignments
- **updateById.php**: Changes to team member details
- **deleteById.php**: Team member removals

### Logged Information
- **User information**: Who made the change (name and ID)
- **Timestamp**: When the change occurred
- **Old vs New values**: Complete before/after snapshot in JSON format
- **IP Address**: Where the request came from
- **User Agent**: Browser/client information

## Audit Log Structure

```sql
fs_audit_log
├── id (Primary Key)
├── fs_det_id (Field Service Job ID)
├── action (e.g., 'create_job', 'update_job', 'delete_job', 'create_team_member', 'update_team_member', 'delete_team_member')
├── user_id (User ID who made change)
├── user_name (Full name of user)
├── old_values (JSON - before changes)
├── new_values (JSON - after changes)
├── ip_address (Client IP)
├── user_agent (Browser/client info)
└── created_at (Timestamp)
```

## API Endpoints

### Get Audit Log for a Job
```
GET /server/Api/FieldServiceMobile/job/getAuditLog.php?id={fs_det_id}
```

**Response:**
```json
{
  "success": true,
  "audit_log": [
    {
      "id": 1,
      "fs_det_id": 12345,
      "action": "update_job",
      "user_id": 42,
      "user_name": "John Doe",
      "old_values": {
        "job": { ... },
        "team": [ ... ]
      },
      "new_values": {
        "job": { ... },
        "team": [ ... ]
      },
      "ip_address": "192.168.1.100",
      "created_at": "2026-02-23 10:30:00"
    }
  ],
  "count": 1
}
```

## Authorized Users

### Job Updates (job/updateById.php)
Only the following users can edit field service jobs:
- Ritz Dacanay
- Adriann Kamakahukilani
- Juvenal Torres
- Heidi Elya

### Team Management (team/*.php)
Team operations are audited for all authenticated users, but access control can be added if needed.

## Querying Audit Data

### Find all changes by a specific user
```sql
SELECT * FROM fs_audit_log 
WHERE user_name = 'Ritz Dacanay' 
ORDER BY created_at DESC;
```

### Find all changes to a specific job
```

### Find all team member changes
```sql
SELECT * FROM fs_audit_log 
WHERE action IN ('create_team_member', 'update_team_member', 'delete_team_member')
ORDER BY created_at DESC;
```

### Find all job lifecycle events (create, update, delete)
```sql
SELECT * FROM fs_audit_log 
WHERE action IN ('create_job', 'update_job', 'delete_job')
ORDER BY created_at DESC;
```

### Track complete lifecycle of a specific job
```sql
SELECT 
    action,
    user_name,
    created_at,
    CASE 
        WHEN action = 'create_job' THEN 'Job Created'
        WHEN action = 'update_job' THEN 'Job Modified'
        WHEN action = 'delete_job' THEN 'Job Deleted'
        ELSE action
    END as event_type
FROM fs_audit_log 
WHERE fs_det_id = 12345
ORDER BY created_at ASC;
```sql
SELECT * FROM fs_audit_log 
WHERE fs_det_id = 12345 
ORDER BY created_at DESC;
```

### Find changes within a date range
```sql
SELECT * FROM fs_audit_log 
WHERE created_at BETWEEN '2026-02-01' AND '2026-02-28'
ORDER BY created_at DESC;
```

### View detailed change history with JSON parsing
```sql
SELECT 
    id,
    fs_det_id,
    user_name,
    created_at,
    JSON_EXTRACT(old_values, '$.job') as old_job,
    JSON_EXTRACT(new_values, '$.job') as new_job
FROM fs_audit_log
WHERE fs_det_id = 12345;
```

## Retention Policy

The audit log table grows over time. Consider implementing a retention policy:
- Keep all records for at least 2 years
- Archive older records to separate table
- Regular backups of audit data

## Security Notes

- Audit logs should be read-only for most users
- Only database administrators should be able to delete audit records
- Consider adding a trigger to prevent accidental deletion
- Regular exports for compliance/backup purposes

## Troubleshooting

### Table doesn't exist error
Run the SQL creation script first

### No audit entries appearing
Check that:
1. The table exists
2. User has INSERT permissions
3. Transaction commits successfully

### JSON fields showing as strings
Use `json_decode()` in PHP or `JSON_EXTRACT()` in MySQL
