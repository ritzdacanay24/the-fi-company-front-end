# EyeFi Serial Number Tracking - Database Implementation Guide

## Overview

This guide covers the **Option 2** implementation for tracking EyeFi serial numbers across multiple tables in the database. This approach uses **foreign key constraints** and **database triggers** to automatically manage serial number status.

## Architecture

### Core Concept
- Each table that uses EyeFi serials has a foreign key reference to `eyefi_serial_numbers.serial_number`
- Database triggers automatically update the status in `eyefi_serial_numbers` when records are created, updated, or deleted
- No additional backend code needed - status management is fully automated

### Tables Tracked
1. **ags_serial** - AGS assets (column: `serialNumber`)
2. **ul_label_usages** - UL label usage records (column: `eyefi_serial_number`)
3. **igt_assets** - IGT assets (column: `eyefi_serial_number`)

## Migration Scripts

### 1. AGS Serial Tracking
**File:** `database/migrations/setup_ags_eyefi_tracking.sql`

**Prerequisites:**
- `ags_serial` table must have `serialNumber` column (already exists)

**What it does:**
- Adds foreign key constraint on `serialNumber` column
- Creates 3 triggers: `mark_eyefi_used_ags_insert`, `mark_eyefi_used_ags_update`, `mark_eyefi_released_ags_delete`
- Marks existing AGS serial numbers as 'assigned'

**Execute:**
```bash
mysql -u [username] -p [database] < database/migrations/setup_ags_eyefi_tracking.sql
```

### 2. UL Label Usage Tracking
**File:** `database/migrations/setup_ul_eyefi_tracking.sql`

**Prerequisites:**
- `ul_label_usages` table must have `eyefi_serial_number` column
- If column doesn't exist, uncomment line 7 in the migration file before running

**What it does:**
- Adds foreign key constraint on `eyefi_serial_number` column
- Creates 3 triggers: `mark_eyefi_used_ul_insert`, `mark_eyefi_used_ul_update`, `mark_eyefi_released_ul_delete`
- Marks existing UL usage serial numbers as 'assigned'

**Execute:**
```bash
mysql -u [username] -p [database] < database/migrations/setup_ul_eyefi_tracking.sql
```

### 3. IGT Assets Tracking
**File:** `database/migrations/setup_igt_eyefi_tracking.sql`

**Prerequisites:**
- `igt_assets` table needs `eyefi_serial_number` column
- If column doesn't exist, uncomment line 7 in the migration file before running

**What it does:**
- Adds foreign key constraint on `eyefi_serial_number` column
- Creates 3 triggers: `mark_eyefi_used_igt_insert`, `mark_eyefi_used_igt_update`, `mark_eyefi_released_igt_delete`
- Marks existing IGT asset serial numbers as 'assigned'

**Execute:**
```bash
mysql -u [username] -p [database] < database/migrations/setup_igt_eyefi_tracking.sql
```

## How It Works

### Foreign Key Constraints
Each table has a foreign key that:
- **ON DELETE SET NULL**: If serial is deleted from `eyefi_serial_numbers`, sets the column to NULL in the referencing table
- **ON UPDATE CASCADE**: If serial number changes in `eyefi_serial_numbers`, updates the column in the referencing table

### Trigger Logic

#### INSERT Trigger
When a new record is created with an EyeFi serial:
1. Checks if serial exists in `eyefi_serial_numbers`
2. If exists, updates status to `'assigned'`
3. Sets `last_assigned_at` and `updated_at` timestamps

#### UPDATE Trigger
When a record's serial number is changed:
1. **Releases old serial**: If old serial is not used elsewhere in the same table, marks it as `'available'`
2. **Assigns new serial**: If new serial exists in `eyefi_serial_numbers`, marks it as `'assigned'`

#### DELETE Trigger
When a record is deleted:
1. Checks if serial is still used in other records of the same table
2. If not used elsewhere, marks serial as `'available'`

**Important:** Triggers only check within their own table. They don't check across tables (AGS, UL, IGT). This means a serial could be marked as 'available' if deleted from AGS, even if it's still used in UL.

## Execution Order

### Recommended Order
1. **AGS first** - This table already has the column, easiest to test
2. **UL Labels second** - May need to add column first
3. **IGT last** - May need to add column first

### Pre-Execution Checklist

```sql
-- Check if columns exist
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ags_serial' AND COLUMN_NAME = 'serialNumber';

SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ul_label_usages' AND COLUMN_NAME = 'eyefi_serial_number';

SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'igt_assets' AND COLUMN_NAME = 'eyefi_serial_number';
```

### Adding Missing Columns

If any columns are missing, run these first:

```sql
-- For UL Label Usages (if needed)
ALTER TABLE ul_label_usages 
ADD COLUMN eyefi_serial_number VARCHAR(50) NULL 
AFTER serial_number;

-- For IGT Assets (if needed)
ALTER TABLE igt_assets 
ADD COLUMN eyefi_serial_number VARCHAR(50) NULL 
AFTER serial_number;
```

## Verification

### After Each Migration

```sql
-- Check Foreign Key
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = '[table_name]' 
  AND CONSTRAINT_NAME LIKE 'fk_%eyefi_serial';

-- Check Triggers
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE EVENT_OBJECT_TABLE = '[table_name]'
ORDER BY TRIGGER_NAME;

-- Check Indexes
SHOW INDEX FROM [table_name] WHERE Key_name LIKE '%eyefi%';
```

### Test Trigger Functionality

```sql
-- Get a test serial
SELECT serial_number, status FROM eyefi_serial_numbers 
WHERE status = 'available' LIMIT 1;

-- For AGS
INSERT INTO ags_serial (serialNumber, ...) VALUES ('eyefi-TEST', ...);
-- Check status
SELECT serial_number, status FROM eyefi_serial_numbers WHERE serial_number = 'eyefi-TEST';
-- Should show status = 'assigned'

-- Update serial
UPDATE ags_serial SET serialNumber = NULL WHERE serialNumber = 'eyefi-TEST';
-- Check status again
SELECT serial_number, status FROM eyefi_serial_numbers WHERE serial_number = 'eyefi-TEST';
-- Should show status = 'available' (if not used elsewhere)

-- Clean up
DELETE FROM ags_serial WHERE serialNumber IS NULL AND ...;
```

## Frontend Integration

### AGS Form
Already integrated with `eyefi-serial-search` component:
```html
<app-eyefi-serial-search 
    formControlName="serialNumber"
    [strictMode]="true"
    [status]="'available'">
</app-eyefi-serial-search>
```

### UL Usage Form
Already integrated with `eyefi-serial-search` component:
```html
<app-eyefi-serial-search 
    formControlName="serial_number"
    [strictMode]="true"
    [status]="'available'">
</app-eyefi-serial-search>
```

### IGT Form
Will need to add the component when ready:
```html
<app-eyefi-serial-search 
    formControlName="eyefi_serial_number"
    [strictMode]="true"
    [status]="'available'">
</app-eyefi-serial-search>
```

## Status Flow

### Typical Lifecycle

1. **New Serial Created**
   - Status: `'available'`
   - Can be selected in forms

2. **Serial Assigned to AGS/UL/IGT**
   - Status: `'assigned'` (via INSERT trigger)
   - No longer shown in "available" dropdowns
   - `last_assigned_at` timestamp updated

3. **Serial Changed/Removed**
   - Status: `'available'` (via UPDATE/DELETE trigger)
   - If not used elsewhere in the same table
   - Can be reassigned

4. **Manual Status Changes**
   - Admin can manually set status to: `'shipped'`, `'returned'`, `'defective'`
   - Triggers don't override manual statuses
   - Only change between `'available'` and `'assigned'`

## Query Examples

### Find Where a Serial is Used

```sql
-- Check AGS
SELECT 'AGS' as source, id, serialNumber, created_at
FROM ags_serial
WHERE serialNumber = 'eyefi-007';

-- Check UL
SELECT 'UL' as source, id, ul_number, eyefi_serial_number, date_used
FROM ul_label_usages
WHERE eyefi_serial_number = 'eyefi-007';

-- Check IGT
SELECT 'IGT' as source, id, asset_tag, eyefi_serial_number, created_at
FROM igt_assets
WHERE eyefi_serial_number = 'eyefi-007';

-- All-in-one query
SELECT * FROM (
    SELECT 'AGS' as source, id, serialNumber as serial, created_at as date_used
    FROM ags_serial WHERE serialNumber = 'eyefi-007'
    UNION ALL
    SELECT 'UL' as source, id, eyefi_serial_number, date_used
    FROM ul_label_usages WHERE eyefi_serial_number = 'eyefi-007'
    UNION ALL
    SELECT 'IGT' as source, id, eyefi_serial_number, created_at
    FROM igt_assets WHERE eyefi_serial_number = 'eyefi-007'
) as usage
ORDER BY date_used DESC;
```

### List All Assigned Serials with Usage

```sql
SELECT 
    esn.serial_number,
    esn.status,
    esn.product_model,
    esn.last_assigned_at,
    COALESCE(ags.count, 0) as ags_count,
    COALESCE(ul.count, 0) as ul_count,
    COALESCE(igt.count, 0) as igt_count
FROM eyefi_serial_numbers esn
LEFT JOIN (
    SELECT serialNumber, COUNT(*) as count 
    FROM ags_serial 
    WHERE serialNumber IS NOT NULL 
    GROUP BY serialNumber
) ags ON esn.serial_number = ags.serialNumber
LEFT JOIN (
    SELECT eyefi_serial_number, COUNT(*) as count 
    FROM ul_label_usages 
    WHERE eyefi_serial_number IS NOT NULL 
    GROUP BY eyefi_serial_number
) ul ON esn.serial_number = ul.eyefi_serial_number
LEFT JOIN (
    SELECT eyefi_serial_number, COUNT(*) as count 
    FROM igt_assets 
    WHERE eyefi_serial_number IS NOT NULL 
    GROUP BY eyefi_serial_number
) igt ON esn.serial_number = igt.eyefi_serial_number
WHERE esn.status = 'assigned'
ORDER BY esn.last_assigned_at DESC;
```

## Rollback

If you need to remove the tracking setup:

```sql
-- AGS
DROP TRIGGER IF EXISTS mark_eyefi_used_ags_insert;
DROP TRIGGER IF EXISTS mark_eyefi_used_ags_update;
DROP TRIGGER IF EXISTS mark_eyefi_released_ags_delete;
ALTER TABLE ags_serial DROP FOREIGN KEY fk_ags_eyefi_serial;
ALTER TABLE ags_serial DROP INDEX idx_ags_eyefi_serial;

-- UL
DROP TRIGGER IF EXISTS mark_eyefi_used_ul_insert;
DROP TRIGGER IF EXISTS mark_eyefi_used_ul_update;
DROP TRIGGER IF EXISTS mark_eyefi_released_ul_delete;
ALTER TABLE ul_label_usages DROP FOREIGN KEY fk_ul_eyefi_serial;
ALTER TABLE ul_label_usages DROP INDEX idx_ul_eyefi_serial;

-- IGT
DROP TRIGGER IF EXISTS mark_eyefi_used_igt_insert;
DROP TRIGGER IF EXISTS mark_eyefi_used_igt_update;
DROP TRIGGER IF EXISTS mark_eyefi_released_igt_delete;
ALTER TABLE igt_assets DROP FOREIGN KEY fk_igt_eyefi_serial;
ALTER TABLE igt_assets DROP INDEX idx_igt_eyefi_serial;
```

## Troubleshooting

### Foreign Key Constraint Fails
**Error:** Cannot add foreign key constraint

**Solutions:**
1. Check if serial numbers in the table exist in `eyefi_serial_numbers`:
   ```sql
   SELECT DISTINCT serialNumber 
   FROM ags_serial 
   WHERE serialNumber IS NOT NULL 
     AND serialNumber NOT IN (SELECT serial_number FROM eyefi_serial_numbers);
   ```
2. Either add missing serials to `eyefi_serial_numbers` or set them to NULL before adding constraint

### Trigger Not Firing
**Check:**
1. Verify trigger exists: `SHOW TRIGGERS LIKE '[table_name]'`
2. Check MySQL error log for trigger errors
3. Ensure user has TRIGGER privilege

### Status Not Updating
**Check:**
1. Verify serial exists in `eyefi_serial_numbers`
2. Check if trigger condition is being met (serial is not NULL)
3. Look for other triggers that might be interfering

## Best Practices

1. **Always backup database before running migrations**
2. **Test on development environment first**
3. **Run migrations during low-traffic periods**
4. **Verify each migration before moving to next**
5. **Keep old serial data for audit trail**
6. **Monitor trigger performance on large tables**

## Future Enhancements

### Option 1 - Historical Tracking
Consider adding a central `eyefi_serial_usage_history` table to track all assignments over time:

```sql
CREATE TABLE eyefi_serial_usage_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    serial_number VARCHAR(50) NOT NULL,
    source_table VARCHAR(50) NOT NULL,
    source_id INT NOT NULL,
    action ENUM('assigned', 'released') NOT NULL,
    assigned_at DATETIME NOT NULL,
    released_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (serial_number) REFERENCES eyefi_serial_numbers(serial_number)
);
```

This would provide complete audit trail of all serial assignments.

### API Endpoint - Check Usage
Add backend endpoint to check where a serial is used:

```php
// GET /api/eyefi-serial-numbers?action=checkUsage&serial=eyefi-007
// Returns: { "used": true, "locations": ["AGS", "UL"], "details": [...] }
```

### Frontend Enhancement - Usage Indicator
Show usage indicator in serial list view:
- Green = Available
- Blue = Assigned (with tooltip showing where)
- Yellow = Shipped
- Red = Defective

## Support

For questions or issues with the tracking setup, contact the development team or refer to:
- `EYEFI_SERIAL_COMPLETE_IMPLEMENTATION.md` - Frontend component documentation
- `EYEFI_DATABASE_TRACKING_IMPLEMENTATION.md` - This guide
