# Work Order Tracking in Serial Assignments

## Overview
Added comprehensive work order tracking to the `serial_assignments` table to maintain full traceability of serial number assignments back to their originating work orders.

## Database Changes

### Migration File
Location: `database/migrations/add_work_order_fields_to_serial_assignments.sql`

### New Columns Added to `serial_assignments` Table

| Column | Type | Description |
|--------|------|-------------|
| `wo_number` | VARCHAR(50) | Work Order Number |
| `wo_part` | VARCHAR(100) | Work Order Part Number |
| `wo_description` | VARCHAR(500) | Work Order Description |
| `wo_qty_ord` | INT(11) | Work Order Ordered Quantity |
| `wo_due_date` | DATE | Work Order Due Date |
| `wo_routing` | VARCHAR(100) | Work Order Routing |
| `wo_line` | VARCHAR(100) | Work Order Line |
| `cp_cust_part` | VARCHAR(100) | Customer Part Number |
| `cp_cust` | VARCHAR(100) | Customer Name from Work Order |

### Indexes Added
- `idx_wo_number` - Fast lookup by work order number
- `idx_wo_part` - Fast lookup by work order part number
- `idx_wo_due_date` - Fast lookup by due date

## Code Changes

### Frontend (TypeScript)
**File**: `src/app/standalone/eyefi-serial-workflow/eyefi-serial-workflow.component.ts`

Updated all asset generation methods to include work order information:
- `generateSGAssets()` - Light and Wonder assets
- `generateAGSAssets()` - AGS assets  
- `generateIGTAssets()` - IGT assets
- `createOtherAssignments()` - Other customer assignments

**Example payload structure:**
```typescript
{
  serialNumber: "147398",
  eyefi_serial_id: 1234,
  ulNumber: "T75097454",
  ul_label_id: 5678,
  // ... other fields ...
  
  // Work Order Information
  wo_number: "40123",
  wo_part: "VWL-03516-420",
  wo_description: "VWL, Cosmic Upright, Bank 4x2",
  wo_qty_ord: 1,
  wo_due_date: "2025-09-16",
  wo_routing: "PROTO",
  wo_line: "PROTO",
  cp_cust_part: "SGN-1610426",
  cp_cust: "BALTEC"
}
```

### Backend (PHP)
**File**: `backend/api/quality/BaseAssetGenerator.php`

Updated `createSerialAssignment()` method to handle new work order fields:
- Added 9 new columns to INSERT statement
- Added corresponding parameter bindings
- Maintained backward compatibility with NULL values

## Benefits

### 1. Complete Traceability
- Every serial assignment can be traced back to its original work order
- Easy to answer questions like "Which work order was this serial used for?"

### 2. Customer Context
- Track both internal part numbers and customer part numbers
- Know which customer the work order was for (from QAD data)

### 3. Reporting & Analytics
- Generate reports by work order
- Track work order completion and serial consumption
- Analyze production patterns by customer, routing, or line

### 4. Quality Control
- Cross-reference serial assignments with work order requirements
- Verify correct quantities were produced
- Track due dates and production schedules

### 5. Audit Trail
- Full history of what serials were used for which work orders
- Supports compliance and quality audits
- Helps troubleshoot production issues

## Usage Example

When creating a serial assignment through the EyeFi Serial Workflow:

1. User enters Work Order Number (Step 1)
2. Work order details are fetched from QAD:
   - Part number, description, quantity
   - Customer part number, customer name
   - Routing, line, due date
3. User proceeds through workflow (Customer → Batch → Serials → Assets)
4. On submission, all work order data is saved with each serial assignment

## Query Examples

### Find all assignments for a work order
```sql
SELECT * FROM serial_assignments 
WHERE wo_number = '40123';
```

### Find assignments by customer
```sql
SELECT * FROM serial_assignments 
WHERE cp_cust = 'BALTEC';
```

### Find assignments by customer part number
```sql
SELECT * FROM serial_assignments 
WHERE cp_cust_part = 'SGN-1610426';
```

### Report: Serial consumption by work order
```sql
SELECT 
    wo_number,
    wo_part,
    wo_description,
    cp_cust,
    COUNT(*) as serials_used,
    wo_qty_ord,
    wo_due_date
FROM serial_assignments
WHERE wo_number IS NOT NULL
GROUP BY wo_number
ORDER BY wo_due_date DESC;
```

## Migration Steps

1. **Run SQL Migration**
   ```bash
   # Execute migration file on database
   mysql -u user -p database < database/migrations/add_work_order_fields_to_serial_assignments.sql
   ```

2. **Deploy Frontend Changes**
   - TypeScript component already updated
   - No additional frontend changes needed

3. **Deploy Backend Changes**
   - PHP BaseAssetGenerator updated
   - Backward compatible (NULL values allowed)

4. **Verify**
   - Create a test serial assignment
   - Verify work order fields are populated
   - Check that existing assignments still work

## Notes

- All work order fields allow NULL for backward compatibility
- Existing records will have NULL in these new fields
- New assignments will automatically populate all available work order data
- Work order data is denormalized for performance and historical reference
- Original work order may change in QAD, but assignment record preserves snapshot

## Related Files

- Migration: `database/migrations/add_work_order_fields_to_serial_assignments.sql`
- Frontend: `src/app/standalone/eyefi-serial-workflow/eyefi-serial-workflow.component.ts`
- Backend: `backend/api/quality/BaseAssetGenerator.php`
- Documentation: This file

## Author
Implementation Date: October 22, 2025
