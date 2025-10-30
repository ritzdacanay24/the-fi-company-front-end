# Serial Assignment Audit Trail & Management

## Overview

Complete audit trail and management system for serial number assignments with void/delete/restore capabilities.

## Features Implemented

### 1. Database Schema

#### Audit Trail Table (`serial_assignment_audit`)
Tracks all actions performed on serial assignments:
- **Actions tracked**: created, voided, deleted, restored
- **Data captured**: who, what, when, why
- **Automatic triggers**: Auto-logs creation events
- **Indexed fields**: assignment_id, serial_number, work_order, performed_at, action

```sql
CREATE TABLE serial_assignment_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    serial_type VARCHAR(50) NOT NULL,
    serial_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    work_order_number VARCHAR(100) NULL,
    assigned_date DATETIME NULL,
    assigned_by VARCHAR(100) NULL,
    reason TEXT NULL,
    performed_by VARCHAR(100) NOT NULL,
    performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSON NULL
)
```

#### Enhanced Serial Assignments Table
Added soft delete columns:
- `is_voided` - Flag for voided assignments (0=active, 1=voided)
- `voided_by` - User who voided the assignment
- `voided_at` - Timestamp of void action
- `void_reason` - Reason for voiding

### 2. Backend API Endpoints

#### Void Assignment (Soft Delete)
**Endpoint**: `POST serial-assignments/index.php?action=void_assignment`

**Request Body**:
```json
{
  "id": 123,
  "reason": "Incorrect work order assignment",
  "performed_by": "john.doe"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Assignment voided successfully",
  "assignment_id": 123
}
```

**Features**:
- Marks assignment as voided (is_voided = 1)
- Records void reason and performer
- Creates audit trail entry
- Voided assignments can be restored

#### Delete Assignment (Hard Delete)
**Endpoint**: `POST serial-assignments/index.php?action=delete_assignment`

**Request Body**:
```json
{
  "id": 123,
  "reason": "Duplicate entry - must be removed",
  "performed_by": "admin.user"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Assignment deleted successfully",
  "assignment_id": 123
}
```

**Features**:
- Creates audit trail entry BEFORE deletion
- Permanently removes assignment record
- Cannot be undone - use with caution

#### Restore Voided Assignment
**Endpoint**: `POST serial-assignments/index.php?action=restore_assignment`

**Request Body**:
```json
{
  "id": 123,
  "performed_by": "john.doe"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Assignment restored successfully",
  "assignment_id": 123
}
```

**Features**:
- Removes voided flag (is_voided = 0)
- Clears void metadata
- Creates audit trail entry for restore action

#### Bulk Void Assignments
**Endpoint**: `POST serial-assignments/index.php?action=bulk_void`

**Request Body**:
```json
{
  "ids": [123, 124, 125],
  "reason": "Batch correction - reassigning to correct WO",
  "performed_by": "john.doe"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Voided 3 out of 3 assignments",
  "voided_count": 3,
  "errors": []
}
```

**Features**:
- Voids multiple assignments in one transaction
- Individual audit trail for each assignment
- Reports success count and any errors

#### Get Audit Trail
**Endpoint**: `GET serial-assignments/index.php?action=get_audit_trail`

**Query Parameters**:
- `assignment_id` (optional) - Filter by specific assignment
- `limit` (optional, default: 100) - Maximum records to return

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "assignment_id": 123,
      "action": "created",
      "serial_type": "eyefi",
      "serial_number": "147191",
      "work_order_number": "WO-12345",
      "assigned_by": "john.doe",
      "reason": null,
      "performed_by": "john.doe",
      "performed_at": "2025-10-24 10:30:00"
    },
    {
      "id": 2,
      "assignment_id": 123,
      "action": "voided",
      "serial_type": "eyefi",
      "serial_number": "147191",
      "work_order_number": "WO-12345",
      "assigned_by": "john.doe",
      "reason": "Incorrect work order",
      "performed_by": "supervisor",
      "performed_at": "2025-10-24 14:15:00"
    }
  ],
  "count": 2
}
```

### 3. Frontend Component Features

#### Serial Assignments Management Interface
Location: `src/app/features/serial-assignments/`

**Key Features**:

1. **Assignment Listing**
   - Table view (desktop) with sortable columns
   - Cards view (mobile-responsive)
   - Status badges (ACTIVE/VOIDED)
   - Pagination (50 items per page)

2. **Filtering**
   - Serial type (eyefi, ul, igt, sg, ags)
   - Work order number (partial match)
   - Serial number (partial match)
   - Assigned by user (partial match)
   - Date range (from/to)
   - Include voided checkbox (show/hide voided assignments)

3. **Action Buttons** (per assignment)
   - **History** (blue) - View audit trail
   - **Void** (yellow) - Soft delete with reason
   - **Restore** (green) - Restore voided assignment
   - **Delete** (red) - Permanent deletion with reason

4. **Bulk Operations**
   - Checkbox selection for multiple assignments
   - Select all toggle
   - Bulk void with shared reason
   - Selection count display

5. **Statistics Dashboard**
   - Total assignments
   - Count by serial type (EyeFi, UL, IGT)
   - Today's assignments
   - This week's assignments

6. **Export**
   - CSV download of filtered results
   - Includes all displayed columns

#### Audit Trail Modal

**Features**:
- View history for single assignment or all assignments
- Table display with action badges
- Color-coded by action type:
  - Green: Created
  - Yellow: Voided
  - Red: Deleted
  - Blue: Restored
- Shows: action, serial, type, WO, reason, performer, timestamp
- Auto-refresh capability
- Empty state handling

#### Void Assignment Modal

**Features**:
- Assignment details preview
- Required reason field (textarea)
- Warning message about restoration capability
- Form validation
- Cancel/Confirm buttons

#### Delete Assignment Modal

**Features**:
- Critical warning banner
- Assignment details preview
- Required reason field (textarea)
- Confirmation prompt (double-check)
- Cannot be undone warning
- Cancel/Delete buttons

### 4. Service Methods

#### SerialAssignmentsService

**New Methods**:

```typescript
// Void single assignment
voidAssignment(id: number, reason: string, performedBy: string): Promise<any>

// Delete single assignment
deleteAssignment(id: number, reason: string, performedBy: string): Promise<any>

// Restore voided assignment
restoreAssignment(id: number, performedBy: string): Promise<any>

// Bulk void assignments
bulkVoidAssignments(ids: number[], reason: string, performedBy: string): Promise<any>

// Get audit trail
getAuditTrail(assignmentId?: number, limit?: number): Promise<any>
```

## Usage Examples

### Voiding an Assignment

1. Navigate to Serial Assignments page
2. Locate assignment to void
3. Click void button (yellow cancel icon)
4. Enter reason: "Assigned to wrong work order"
5. Click "Void Assignment"
6. Assignment shows as VOIDED with yellow highlight

### Viewing Audit Trail

1. Click history button (blue clock icon) on any assignment
2. Modal opens showing all actions for that assignment
3. See creation, voids, deletes, restores with timestamps
4. Close modal when done

### Bulk Voiding

1. Check multiple assignments using checkboxes
2. Click "Void Selected (N)" button in header
3. Enter reason in prompt
4. All selected assignments are voided with same reason

### Restoring Voided Assignment

1. Enable "Include Voided Assignments" filter
2. Locate voided assignment (yellow highlight)
3. Click restore button (green icon)
4. Confirm restoration
5. Assignment returns to active status

### Permanent Deletion

1. Click delete button (red trash icon)
2. Read critical warning
3. Enter detailed reason
4. Confirm deletion prompt
5. Assignment permanently removed (audit trail preserved)

## Database Triggers

### Auto-Audit on Creation

```sql
CREATE TRIGGER trg_serial_assignment_audit_insert
AFTER INSERT ON serial_assignments
FOR EACH ROW
BEGIN
    INSERT INTO serial_assignment_audit (
        assignment_id, action, serial_type, serial_id,
        serial_number, work_order_number, assigned_date,
        assigned_by, performed_by, performed_at
    ) VALUES (
        NEW.id, 'created', NEW.serial_type, NEW.serial_id,
        NEW.serial_number, NEW.work_order_number, NEW.assigned_date,
        NEW.assigned_by, NEW.assigned_by, NOW()
    );
END
```

**Features**:
- Automatically logs every assignment creation
- No code changes needed for basic tracking
- Captures all assignment details
- Timestamped at creation

## Security Considerations

1. **User Authentication**
   - All actions require `performed_by` user identifier
   - Update `currentUser` in component from your auth service
   - Consider adding role-based access control

2. **Reason Requirement**
   - Void and delete operations require reasons
   - Frontend validation enforces non-empty reasons
   - Backend validates before processing

3. **Audit Trail Immutability**
   - Audit records never deleted (even on hard delete)
   - Provides permanent history
   - Critical for compliance and troubleshooting

4. **Transaction Safety**
   - All operations wrapped in transactions
   - Rollback on error
   - Audit and data changes atomic

## Best Practices

### When to Void vs Delete

**Use VOID when**:
- Assignment was incorrect but needs history
- May need to restore later
- Want reversible action
- Standard operational correction

**Use DELETE when**:
- Duplicate entry created by mistake
- Test data in production
- Data quality issue requiring removal
- Confirmed permanent removal needed

### Reason Guidelines

**Good Reasons**:
- "Assigned to incorrect work order WO-12345, should be WO-12346"
- "Serial consumed but unit failed QA - serial needs reassignment"
- "Duplicate entry - same serial assigned twice to WO-12345"
- "Test data accidentally created in production"

**Bad Reasons**:
- "mistake"
- "wrong"
- "oops"
- ""

### Audit Trail Queries

**Find all voids by user**:
```sql
SELECT * FROM serial_assignment_audit
WHERE action = 'voided' AND performed_by = 'john.doe'
ORDER BY performed_at DESC;
```

**Find assignments with multiple actions**:
```sql
SELECT assignment_id, COUNT(*) as action_count
FROM serial_assignment_audit
GROUP BY assignment_id
HAVING action_count > 1;
```

**Find deletions with reasons**:
```sql
SELECT * FROM serial_assignment_audit
WHERE action = 'deleted' AND reason IS NOT NULL
ORDER BY performed_at DESC;
```

## Migration Instructions

1. **Run SQL Migration**:
   ```bash
   mysql -u username -p database_name < database/migrations/create_serial_assignment_audit.sql
   ```

2. **Verify Tables**:
   ```sql
   SHOW TABLES LIKE '%audit%';
   DESC serial_assignment_audit;
   DESC serial_assignments;
   ```

3. **Verify Trigger**:
   ```sql
   SHOW TRIGGERS WHERE `Table` = 'serial_assignments';
   ```

4. **Test Audit Trail**:
   ```sql
   -- Create test assignment
   INSERT INTO serial_assignments (serial_type, serial_id, serial_number, work_order_number, assigned_date, assigned_by)
   VALUES ('test', 1, 'TEST123', 'WO-TEST', NOW(), 'test_user');
   
   -- Check audit trail
   SELECT * FROM serial_assignment_audit WHERE serial_number = 'TEST123';
   ```

5. **Add to Routing** (if not already added):
   ```typescript
   {
     path: 'serial-assignments',
     component: SerialAssignmentsComponent,
     data: { title: 'Serial Assignments' }
   }
   ```

## Troubleshooting

### Audit trail not showing
- Check if audit table exists
- Verify trigger is active
- Check PHP error logs for API errors
- Verify API endpoint is accessible

### Void/Delete not working
- Check user permissions on database
- Verify transaction support (InnoDB engine)
- Check for foreign key constraints
- Review PHP error logs

### Modal not appearing
- Check browser console for JavaScript errors
- Verify Bootstrap CSS is loaded
- Check modal backdrop z-index conflicts

## Future Enhancements

1. **Role-Based Access**
   - Restrict delete to admins only
   - Void requires supervisor approval
   - Read-only audit trail for all users

2. **Advanced Filtering**
   - Filter by action type in audit trail
   - Date range for audit queries
   - User-specific audit history

3. **Notifications**
   - Email on void/delete actions
   - Daily audit summary reports
   - Alert on suspicious patterns

4. **Bulk Restore**
   - Restore multiple voided assignments
   - Undo recent bulk void operation

5. **Export Audit Trail**
   - CSV export of audit history
   - PDF reports for compliance
   - Excel format with formatting

## API Documentation

See full API documentation in `docs/serial-assignments-api-documentation.md`

## Related Documentation

- [Serial Number Generator Guide](serial-number-generator-guide.md)
- [Serial Assignment Tracking](serial-assignment-tracking-implementation.md)
- [Serial Availability API](api-documentation-serial-availability.md)
