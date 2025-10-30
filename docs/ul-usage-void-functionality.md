# UL Usage Void Functionality

## Overview
The UL (Underwriters Laboratories) Usage Void feature allows authorized users to void UL label usage records and free up the associated resources (UL labels and EyeFi serial numbers) for reuse.

## Implementation Date
October 27, 2025

## Purpose
- Correct mistakes in UL label assignments
- Free up incorrectly consumed UL labels and EyeFi serial numbers
- Maintain audit trail of voided records
- Enable resource reuse without data loss

## Features

### 1. Void Usage Record
**What happens when voiding:**
- The usage record is marked as voided (soft delete)
- UL label status changes to 'available' and is_consumed set to 0
- EyeFi serial number status changes to 'available'
- EyeFi serial assignment fields are cleared (assigned_to_table, assigned_to_id, assigned_by, assigned_at)
- Void reason and void date are recorded for audit purposes

**What remains unchanged:**
- Original usage record remains in database
- Work order associations (if any)
- Historical audit trail

### 2. Delete Usage Record
**What happens when deleting:**
- Complete removal of the usage record from database
- Cannot be recovered (hard delete)
- Use with caution - typically only for test/erroneous data

**Warning:** Delete does NOT free the UL label or EyeFi serial. Use Void for normal corrections.

### 3. Restore Usage Record (Coming Soon)
- Re-activates a voided usage record
- Re-assigns the UL label and EyeFi serial
- Planned for future implementation

## Database Schema Changes

### ul_label_usages Table
New columns added:
```sql
is_voided TINYINT(1) NOT NULL DEFAULT 0
void_reason TEXT DEFAULT NULL
void_date TIMESTAMP NULL DEFAULT NULL
wo_nbr INT(11) DEFAULT NULL
wo_due_date DATE DEFAULT NULL
wo_part VARCHAR(100) DEFAULT NULL
wo_qty_ord INT(11) DEFAULT NULL
wo_routing VARCHAR(50) DEFAULT NULL
wo_line VARCHAR(50) DEFAULT NULL
wo_description TEXT DEFAULT NULL
```

### ul_labels Table
New column added:
```sql
is_consumed TINYINT(1) NOT NULL DEFAULT 0
```

### Updated View: vw_ul_usage_report
Now includes:
- Void status fields (is_voided, void_reason, void_date)
- Work order fields (wo_nbr, wo_part, wo_description, etc.)
- Computed usage_status field ('voided' or 'active')

## API Endpoints

### Void Usage
```
POST /backend/api/ul-labels/usage.php?id={id}&action=void
Body: {
  "void_reason": "Optional reason for voiding"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "freed_ul_label": "E123456",
    "freed_eyefi_serial": "EF-2024-001"
  },
  "message": "Usage record voided and resources freed successfully"
}
```

### Delete Usage
```
DELETE /backend/api/ul-labels/usage.php?id={id}
```

**Response:**
```json
{
  "success": true,
  "message": "Usage record deleted successfully"
}
```

## Frontend Components

### UL Usage Report Component
**File:** `src/app/features/ul-management/components/ul-usage-report/ul-usage-report.component.ts`

**Features:**
- Status column showing ACTIVE/VOIDED badges
- Action buttons in each row:
  - **Void** (warning icon) - For active records
  - **Delete** (trash icon) - For all records
  - **Restore** (restore icon) - For voided records (coming soon)

**Grid Configuration:**
- Actions column pinned to right
- Status column with badge styling
- Proper button sizing (btn-sm) and alignment

## User Interface

### Void Modal
- Warning message about freeing resources
- Optional void reason textarea
- Cancel/Void buttons

### Delete Modal
- Danger warning about permanent deletion
- Confirmation required
- Cancel/Delete buttons

### Status Badges
- **Green ACTIVE**: Normal usage record
- **Red VOIDED**: Voided usage record

## Service Methods

### ULLabelService
```typescript
voidULLabelUsage(id: number, voidReason?: string): Observable<any>
deleteULLabelUsage(id: number): Observable<any>
```

## Transaction Safety

All void operations are wrapped in database transactions:
1. Begin transaction
2. Mark usage as voided
3. Free UL label
4. Free EyeFi serial
5. Commit transaction
6. Rollback on any error

## Use Cases

### Scenario 1: Wrong UL Label Used
1. User realizes wrong UL label was assigned
2. Click **Void** button on the usage record
3. Enter reason: "Wrong label - should be E123457 not E123456"
4. Confirm void
5. Both UL label and EyeFi serial are freed
6. Create new usage record with correct UL label

### Scenario 2: Duplicate Entry
1. User accidentally created duplicate usage record
2. Click **Void** on the duplicate
3. Enter reason: "Duplicate entry"
4. Confirm void
5. Resources freed for reuse

### Scenario 3: Test Data Cleanup
1. Test entries need removal
2. Click **Delete** (not void) on test records
3. Confirm deletion
4. Records permanently removed

## Best Practices

### When to Void
- Incorrect UL label assignment
- Incorrect EyeFi serial assignment
- Need to reuse resources
- Correcting data entry errors

### When to Delete
- Test/dummy data removal
- Truly erroneous entries that should not exist
- Data cleanup operations

### When to Record Reason
Always provide a void reason for audit purposes:
- Helps track why resources were freed
- Assists in troubleshooting
- Provides accountability

## Audit Trail

Voided records maintain complete audit trail:
- Original usage data preserved
- Void reason recorded
- Void date timestamp
- Original assignment dates
- User signatures maintained

## Integration Points

### With Serial Assignment System
- Voiding UL usage frees EyeFi serial numbers
- Serial becomes available in Serial Assignments view
- Consistent with serial-assignments void behavior

### With UL Label Management
- Voiding usage updates UL label status to 'available'
- Label appears in available labels list
- is_consumed flag updated for tracking

### With Work Order System
- Work order associations preserved even when voided
- Historical tracking of which WOs used which labels
- Reporting maintains work order context

## Migration Steps

1. Run migration script:
   ```bash
   mysql -u username -p eyefidb < database/migrations/add_ul_usage_void_columns.sql
   ```

2. Verify columns added:
   ```sql
   DESCRIBE ul_label_usages;
   DESCRIBE ul_labels;
   ```

3. Test void functionality:
   - Void a usage record
   - Verify UL label status = 'available'
   - Verify EyeFi serial status = 'available'
   - Check void_date and void_reason populated

## Future Enhancements

### Restore Functionality
- Un-void usage records
- Re-assign resources
- Validate resources still available

### Bulk Void
- Select multiple usage records
- Void all at once
- Batch resource freeing

### Advanced Reporting
- Void history report
- Resource utilization after voids
- Void reason analytics

## Related Documentation
- [Serial Assignments Void Feature](./EYEFI_SERIAL_AUTOFILL_FEATURE.md)
- [Multi-Customer Serial System](./multi-customer-serial-system.md)
- [UL Usage Form Implementation](../UL_USAGE_FORM_EYEFI_UPDATE.md)
- [Database Migration Guide](./eyefi-database-tracking-implementation.md)

## Technical Notes

### Database Transaction Pattern
```php
try {
    $this->conn->beginTransaction();
    
    // 1. Mark usage as voided
    // 2. Free UL label
    // 3. Free EyeFi serial
    
    $this->conn->commit();
} catch (Exception $e) {
    $this->conn->rollBack();
    throw $e;
}
```

### Frontend State Management
```typescript
// Modal state
showVoidModal = false;
selectedUsageId: number | null = null;
voidReason = '';

// Action flow
openVoidModal(id) → user enters reason → confirmVoid() → API call → refresh data
```

### AG Grid Button Handling
```typescript
// Use event delegation for dynamically rendered buttons
eGridDiv.addEventListener('click', (e: Event) => {
  const button = e.target.closest('.action-btn');
  if (button) {
    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');
    // Handle action
  }
});
```

## Troubleshooting

### Void button not showing
- Check `is_voided` field in database
- Verify cellRenderer logic: `params.data.is_voided == 1`
- Clear browser cache

### Resources not freed
- Check transaction rollback logs
- Verify UL label exists
- Verify EyeFi serial exists
- Check database foreign key constraints

### Modal not displaying
- Verify `showVoidModal` binding
- Check Bootstrap modal CSS loaded
- Inspect console for errors

## Testing Checklist

- [ ] Void active usage record
- [ ] Verify UL label freed (status = 'available')
- [ ] Verify EyeFi serial freed (status = 'available')
- [ ] Void reason recorded
- [ ] Void date set
- [ ] Status badge changes to VOIDED
- [ ] Action buttons update (Void → Restore)
- [ ] Delete voided record
- [ ] Delete active record
- [ ] Modal cancel buttons work
- [ ] Toast notifications appear
- [ ] Grid refreshes after actions
- [ ] Transaction rollback on error
