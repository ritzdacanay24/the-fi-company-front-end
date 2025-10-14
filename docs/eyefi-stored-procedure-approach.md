# EyeFi Serial Tracking - Stored Procedure Approach

## Overview

This is a **simpler, more explicit** approach to tracking EyeFi serial usage. Instead of automatic triggers, you call stored procedures from your PHP backend code.

## Comparison: Triggers vs Stored Procedures

| Aspect | Triggers (Option 2) | Stored Procedures (Option 3) |
|--------|---------------------|------------------------------|
| **Automatic** | ✅ Yes - fires on INSERT/UPDATE/DELETE | ❌ No - must call explicitly |
| **Debugging** | ❌ Hard - hidden behavior | ✅ Easy - explicit calls |
| **Control** | ❌ Less - automatic behavior | ✅ More - full control |
| **Code Visibility** | ❌ Hidden in database | ✅ Visible in backend code |
| **Error Handling** | ❌ Silent failures | ✅ Can catch errors |
| **Testing** | ❌ Harder to test | ✅ Easy to test |
| **Maintenance** | ❌ Must remember triggers exist | ✅ Clear from code |
| **Forgetting to Call** | ✅ Can't forget - automatic | ❌ Can forget - manual |

## Recommendation

**Use Stored Procedures (Option 3)** if:
- You value code clarity and debuggability
- You want explicit control over when serials are marked
- You want to add logging/error handling
- Your team prefers explicit over implicit behavior

**Use Triggers (Option 2)** if:
- You want it fully automatic with no backend code changes
- You never want to forget to mark a serial
- You have many places that assign serials

## Implementation

### 1. Database Setup

Run the stored procedure migration:

```bash
mysql -u [username] -p [database] < database/migrations/setup_eyefi_stored_procedures.sql
```

This creates 3 procedures:
- `mark_eyefi_serial_used(serial, source_table, source_id)`
- `mark_eyefi_serial_available(serial, source_table, source_id)`
- `check_eyefi_serial_usage(serial)`

### 2. PHP Backend Implementation

#### AGS Serial - Create/Update

**File:** `backend/api/operations/ags-serial.php`

```php
<?php
// When creating/updating AGS record with EyeFi serial

// After successfully saving AGS record
if (!empty($data['serialNumber'])) {
    markEyeFiSerialUsed($pdo, $data['serialNumber'], 'ags_serial', $agsId);
}

// Helper function
function markEyeFiSerialUsed($pdo, $serialNumber, $sourceTable, $sourceId) {
    try {
        $stmt = $pdo->prepare("CALL mark_eyefi_serial_used(?, ?, ?)");
        $stmt->execute([$serialNumber, $sourceTable, $sourceId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Optional: Log the result
        error_log("EyeFi Serial Marked: " . json_encode($result));
        
        return $result['success'] ?? 0;
    } catch (Exception $e) {
        error_log("Error marking EyeFi serial: " . $e->getMessage());
        return 0;
    }
}
```

#### AGS Serial - Delete

```php
<?php
// When deleting AGS record

// Before deleting AGS record
if (!empty($agsRecord['serialNumber'])) {
    markEyeFiSerialAvailable($pdo, $agsRecord['serialNumber'], 'ags_serial', $agsId);
}

// Delete the AGS record
$stmt = $pdo->prepare("DELETE FROM ags_serial WHERE id = ?");
$stmt->execute([$agsId]);

// Helper function
function markEyeFiSerialAvailable($pdo, $serialNumber, $sourceTable, $sourceId) {
    try {
        $stmt = $pdo->prepare("CALL mark_eyefi_serial_available(?, ?, ?)");
        $stmt->execute([$serialNumber, $sourceTable, $sourceId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("EyeFi Serial Released: " . json_encode($result));
        
        return $result['success'] ?? 0;
    } catch (Exception $e) {
        error_log("Error releasing EyeFi serial: " . $e->getMessage());
        return 0;
    }
}
```

#### AGS Serial - Update (Serial Changed)

```php
<?php
// When updating AGS record and serial number changes

$oldSerial = $agsRecord['serialNumber']; // From database
$newSerial = $data['serialNumber'];      // From request

// Update the record
$stmt = $pdo->prepare("UPDATE ags_serial SET serialNumber = ? WHERE id = ?");
$stmt->execute([$newSerial, $agsId]);

// Handle serial change
if ($oldSerial !== $newSerial) {
    // Release old serial
    if (!empty($oldSerial)) {
        markEyeFiSerialAvailable($pdo, $oldSerial, 'ags_serial', $agsId);
    }
    
    // Mark new serial as used
    if (!empty($newSerial)) {
        markEyeFiSerialUsed($pdo, $newSerial, 'ags_serial', $agsId);
    }
}
```

### 3. UL Label Usages Implementation

**File:** `backend/api/ul-labels/usage.php`

```php
<?php
// When creating UL usage record

// After saving UL usage record
if (!empty($data['eyefi_serial_number'])) {
    markEyeFiSerialUsed($pdo, $data['eyefi_serial_number'], 'ul_label_usages', $usageId);
}

// When deleting UL usage record
if (!empty($usageRecord['eyefi_serial_number'])) {
    markEyeFiSerialAvailable($pdo, $usageRecord['eyefi_serial_number'], 'ul_label_usages', $usageId);
}
```

### 4. IGT Assets Implementation

**File:** `backend/api/IgtAssets/igt-assets.php`

```php
<?php
// When creating IGT asset

// After saving IGT asset
if (!empty($data['eyefi_serial_number'])) {
    markEyeFiSerialUsed($pdo, $data['eyefi_serial_number'], 'igt_assets', $assetId);
}

// When deleting IGT asset
if (!empty($assetRecord['eyefi_serial_number'])) {
    markEyeFiSerialAvailable($pdo, $assetRecord['eyefi_serial_number'], 'igt_assets', $assetId);
}
```

## Shared Helper Class

Create a reusable class for all EyeFi operations:

**File:** `backend/api/eyefi-serial-numbers/EyeFiSerialHelper.php`

```php
<?php

class EyeFiSerialHelper {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Mark an EyeFi serial as used/assigned
     */
    public function markUsed($serialNumber, $sourceTable, $sourceId) {
        try {
            $stmt = $this->pdo->prepare("CALL mark_eyefi_serial_used(?, ?, ?)");
            $stmt->execute([$serialNumber, $sourceTable, $sourceId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result['success']) {
                error_log("Failed to mark EyeFi serial: {$result['message']}");
            }
            
            return $result['success'] ?? 0;
        } catch (Exception $e) {
            error_log("Error marking EyeFi serial: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Mark an EyeFi serial as available/released
     */
    public function markAvailable($serialNumber, $sourceTable, $sourceId) {
        try {
            $stmt = $this->pdo->prepare("CALL mark_eyefi_serial_available(?, ?, ?)");
            $stmt->execute([$serialNumber, $sourceTable, $sourceId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result['success']) {
                error_log("Failed to release EyeFi serial: {$result['message']}");
            }
            
            return $result['success'] ?? 0;
        } catch (Exception $e) {
            error_log("Error releasing EyeFi serial: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Check where a serial is being used
     */
    public function checkUsage($serialNumber) {
        try {
            $stmt = $this->pdo->prepare("CALL check_eyefi_serial_usage(?)");
            $stmt->execute([$serialNumber]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error checking EyeFi usage: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Handle serial update (change from old to new)
     */
    public function handleSerialChange($oldSerial, $newSerial, $sourceTable, $sourceId) {
        // Release old serial
        if (!empty($oldSerial) && $oldSerial !== $newSerial) {
            $this->markAvailable($oldSerial, $sourceTable, $sourceId);
        }
        
        // Mark new serial as used
        if (!empty($newSerial) && $oldSerial !== $newSerial) {
            $this->markUsed($newSerial, $sourceTable, $sourceId);
        }
    }
}
```

**Usage Example:**

```php
<?php
require_once __DIR__ . '/../eyefi-serial-numbers/EyeFiSerialHelper.php';

$eyefiHelper = new EyeFiSerialHelper($pdo);

// Creating a record
if (!empty($data['serialNumber'])) {
    $eyefiHelper->markUsed($data['serialNumber'], 'ags_serial', $agsId);
}

// Updating a record
$eyefiHelper->handleSerialChange(
    $oldRecord['serialNumber'], 
    $data['serialNumber'], 
    'ags_serial', 
    $agsId
);

// Deleting a record
if (!empty($record['serialNumber'])) {
    $eyefiHelper->markAvailable($record['serialNumber'], 'ags_serial', $agsId);
}

// Check where serial is used
$usage = $eyefiHelper->checkUsage('eyefi-007');
if (!empty($usage)) {
    // Serial is in use
    return ['error' => 'Serial is already in use', 'usage' => $usage];
}
```

## Testing

### Direct SQL Testing

```sql
-- Test marking as used
CALL mark_eyefi_serial_used('eyefi-007', 'ags_serial', 123);

-- Verify status
SELECT serial_number, status, last_assigned_at 
FROM eyefi_serial_numbers 
WHERE serial_number = 'eyefi-007';

-- Check usage
CALL check_eyefi_serial_usage('eyefi-007');

-- Mark as available
CALL mark_eyefi_serial_available('eyefi-007', 'ags_serial', 123);

-- Verify status
SELECT serial_number, status 
FROM eyefi_serial_numbers 
WHERE serial_number = 'eyefi-007';
```

### PHP Testing

```php
<?php
// Test script: test_eyefi_helper.php

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/api/eyefi-serial-numbers/EyeFiSerialHelper.php';

$eyefiHelper = new EyeFiSerialHelper($pdo);

// Test 1: Mark as used
echo "Test 1: Mark serial as used\n";
$result = $eyefiHelper->markUsed('eyefi-007', 'test_table', 999);
echo "Result: " . ($result ? "Success" : "Failed") . "\n\n";

// Test 2: Check usage
echo "Test 2: Check where serial is used\n";
$usage = $eyefiHelper->checkUsage('eyefi-007');
print_r($usage);
echo "\n";

// Test 3: Mark as available
echo "Test 3: Mark serial as available\n";
$result = $eyefiHelper->markAvailable('eyefi-007', 'test_table', 999);
echo "Result: " . ($result ? "Success" : "Failed") . "\n\n";

// Test 4: Handle serial change
echo "Test 4: Handle serial change\n";
$eyefiHelper->handleSerialChange('eyefi-007', 'eyefi-008', 'test_table', 999);
echo "Done\n";
```

## Debugging

### Enable Logging

Add to your PHP configuration:

```php
<?php
// config/eyefi_config.php
define('EYEFI_DEBUG', true);

// In EyeFiSerialHelper.php
if (defined('EYEFI_DEBUG') && EYEFI_DEBUG) {
    error_log("EyeFi: Marking {$serialNumber} as used in {$sourceTable}:{$sourceId}");
}
```

### Check Logs

```bash
# PHP error log
tail -f /var/log/php/error.log | grep EyeFi

# MySQL query log (if enabled)
tail -f /var/log/mysql/query.log | grep eyefi
```

### Manual Verification

```sql
-- See all assigned serials
SELECT serial_number, status, last_assigned_at
FROM eyefi_serial_numbers
WHERE status = 'assigned'
ORDER BY last_assigned_at DESC;

-- Find orphaned assignments (marked as assigned but not in any table)
SELECT esn.serial_number, esn.status
FROM eyefi_serial_numbers esn
WHERE esn.status = 'assigned'
  AND esn.serial_number NOT IN (SELECT serialNumber FROM ags_serial WHERE serialNumber IS NOT NULL)
  AND esn.serial_number NOT IN (SELECT eyefi_serial_number FROM ul_label_usages WHERE eyefi_serial_number IS NOT NULL)
  AND esn.serial_number NOT IN (SELECT eyefi_serial_number FROM igt_assets WHERE eyefi_serial_number IS NOT NULL);
```

## Migration from Triggers

If you already have triggers set up and want to switch to stored procedures:

```sql
-- Remove all triggers
DROP TRIGGER IF EXISTS mark_eyefi_used_ags_insert;
DROP TRIGGER IF EXISTS mark_eyefi_used_ags_update;
DROP TRIGGER IF EXISTS mark_eyefi_released_ags_delete;

DROP TRIGGER IF EXISTS mark_eyefi_used_ul_insert;
DROP TRIGGER IF EXISTS mark_eyefi_used_ul_update;
DROP TRIGGER IF EXISTS mark_eyefi_released_ul_delete;

DROP TRIGGER IF EXISTS mark_eyefi_used_igt_insert;
DROP TRIGGER IF EXISTS mark_eyefi_used_igt_update;
DROP TRIGGER IF EXISTS mark_eyefi_released_igt_delete;

-- Remove foreign keys (optional - can keep them for data integrity)
ALTER TABLE ags_serial DROP FOREIGN KEY fk_ags_eyefi_serial;
ALTER TABLE ul_label_usages DROP FOREIGN KEY fk_ul_eyefi_serial;
ALTER TABLE igt_assets DROP FOREIGN KEY fk_igt_eyefi_serial;

-- Then run the stored procedure migration
SOURCE database/migrations/setup_eyefi_stored_procedures.sql;
```

## Pros and Cons Summary

### ✅ Advantages
- **Clear and explicit** - You see exactly when serials are marked
- **Easy to debug** - Add logging, breakpoints, error handling
- **Full control** - Decide when and how to mark serials
- **Error handling** - Can catch and handle errors gracefully
- **Testing** - Easy to unit test the helper class
- **No hidden behavior** - Everything visible in your code

### ❌ Disadvantages
- **Manual calls** - Must remember to call procedures
- **More code** - Need to add calls in multiple places
- **Can forget** - If you forget to call, serial won't be marked
- **Consistency** - Different developers might implement differently

## Recommendation

For your use case, I'd recommend **Option 3 (Stored Procedures)** because:

1. You're just starting with EyeFi tracking - simpler is better
2. You have 3 clear places to track (AGS, UL, IGT)
3. Debugging will be easier as you refine the system
4. You can add logging/notifications easily
5. The code is more maintainable and visible

The trigger approach (Option 2) would be better if you had:
- Dozens of tables using EyeFi serials
- Legacy code that's hard to modify
- Need for 100% guarantee that serials are always marked

**My vote: Go with Option 3 (Stored Procedures)** 👍
