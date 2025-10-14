# EyeFi Serial Number Tracking System

## Overview

This system automatically tracks EyeFi serial number usage across multiple tables (AGS, UL Labels, IGT) using database triggers. When a serial number is assigned to a record, it's automatically marked as "assigned" in the `eyefi_serial_numbers` table.

## Files in This Folder

### API Files
- **index.php** - Main API endpoint for EyeFi serial number operations
- **EyeFiSerialHelper.php** - PHP helper class (not needed with triggers)
- **usage-examples.php** - PHP examples (not needed with triggers)
- **API_DOCUMENTATION.md** - API documentation

### Migration Files (Database Triggers)
- **migrations/setup_ags_triggers.sql** - AGS table trigger setup
- **migrations/setup_ul_triggers.sql** - UL Labels table trigger setup (TBD)
- **migrations/setup_igt_triggers.sql** - IGT table trigger setup (TBD)

## Installation

### Step 1: Run the Trigger Migrations

```bash
# For AGS tracking
mysql -u [username] -p [database] < backend/api/eyefi-serial-numbers/migrations/setup_ags_triggers.sql

# For UL tracking (when created)
mysql -u [username] -p [database] < backend/api/eyefi-serial-numbers/migrations/setup_ul_triggers.sql

# For IGT tracking (when created)
mysql -u [username] -p [database] < backend/api/eyefi-serial-numbers/migrations/setup_igt_triggers.sql
```

### Step 2: Verify Installation

```sql
-- Check triggers were created
SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_NAME LIKE '%eyefi%'
ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME;
```

## How It Works

### Automatic Tracking

Once triggers are installed, serial number tracking happens automatically:

#### Creating a Record
```php
// Your existing PHP code - no changes needed!
$stmt = $pdo->prepare("INSERT INTO agsSerialGenerator (serialNumber, ...) VALUES (?, ...)");
$stmt->execute(['eyefi-007', ...]);

// Trigger automatically marks 'eyefi-007' as 'assigned' ✅
```

#### Updating Serial Number
```php
// Your existing PHP code - no changes needed!
$stmt = $pdo->prepare("UPDATE agsSerialGenerator SET serialNumber = ? WHERE id = ?");
$stmt->execute(['eyefi-008', 123]);

// Trigger automatically:
// - Marks 'eyefi-007' as 'available' (if not used elsewhere) ✅
// - Marks 'eyefi-008' as 'assigned' ✅
```

#### Deleting a Record
```php
// Your existing PHP code - no changes needed!
$stmt = $pdo->prepare("DELETE FROM agsSerialGenerator WHERE id = ?");
$stmt->execute([123]);

// Trigger automatically marks serial as 'available' (if not used elsewhere) ✅
```

### No PHP Code Changes Required

The triggers work at the database level, so your existing API endpoints continue to work without modification!

## Tables Tracked

### 1. AGS (agsSerialGenerator)
- **Column:** `serialNumber`
- **Migration:** `migrations/setup_ags_triggers.sql`
- **Status:** ✅ Ready
- **Triggers:**
  - `mark_eyefi_used_ags_insert` - Assigns on INSERT
  - `mark_eyefi_used_ags_update` - Updates on serial change
  - `mark_eyefi_released_ags_delete` - Releases on DELETE

### 2. UL Labels (ul_label_usages)
- **Column:** `eyefi_serial_number` (TBD)
- **Migration:** `migrations/setup_ul_triggers.sql` (TBD)
- **Status:** ⏳ To be created

### 3. IGT Assets (igt_assets)
- **Column:** `serial_number` (TBD)
- **Migration:** `migrations/setup_igt_triggers.sql` (TBD)
- **Status:** ⏳ To be created

## Troubleshooting

### Check if Triggers are Active

```sql
-- List all EyeFi triggers
SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_NAME LIKE '%eyefi%';
```

### Test Trigger Functionality

```sql
-- Get an available serial
SELECT serial_number FROM eyefi_serial_numbers WHERE status = 'available' LIMIT 1;

-- Insert test record
INSERT INTO agsSerialGenerator (serialNumber, sgPartNumber) VALUES ('eyefi-TEST', 'TEST');

-- Check if serial was marked as assigned
SELECT serial_number, status, assigned_at FROM eyefi_serial_numbers WHERE serial_number = 'eyefi-TEST';
-- Should show status = 'assigned'

-- Clean up
DELETE FROM agsSerialGenerator WHERE serialNumber = 'eyefi-TEST';
```

### Remove Triggers

```sql
DROP TRIGGER IF EXISTS mark_eyefi_used_ags_insert;
DROP TRIGGER IF EXISTS mark_eyefi_used_ags_update;
DROP TRIGGER IF EXISTS mark_eyefi_released_ags_delete;
```

## Benefits

✅ **Automatic** - No manual calls needed
✅ **Consistent** - Works the same across all tables
✅ **Reliable** - Can't forget to mark serials
✅ **Zero code changes** - Existing API continues to work
✅ **Transaction safe** - Triggers run within the same transaction
✅ **Easy to debug** - Clear trigger names and logic

## Future Enhancements

### Historical Tracking (Optional)

Create a history table to track all serial assignments:

```sql
CREATE TABLE eyefi_serial_usage_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    serial_number VARCHAR(100) NOT NULL,
    source_table VARCHAR(50) NOT NULL,
    source_id INT NOT NULL,
    action ENUM('assigned', 'released') NOT NULL,
    action_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_by VARCHAR(100) NULL,
    FOREIGN KEY (serial_number) REFERENCES eyefi_serial_numbers(serial_number)
);
```

Then uncomment the history logging lines in the triggers.

## Support

For issues or questions:
1. Check trigger status: `SHOW TRIGGERS LIKE '%eyefi%'`
2. Check MySQL error log
3. Review verification queries in migration files
