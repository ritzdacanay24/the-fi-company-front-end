# EyeFi Serial Tracking - Transaction Safety Guide

## The Problem

**Without Transactions:**
```php
// Save AGS record
$stmt = $pdo->prepare("INSERT INTO ags_serial (serialNumber, ...) VALUES (?, ...)");
$stmt->execute(['eyefi-007', ...]);
$agsId = $pdo->lastInsertId();

// Mark serial as used
$result = $eyefiHelper->markUsed('eyefi-007', 'ags_serial', $agsId);

if (!$result['success']) {
    // ❌ PROBLEM: AGS record is already saved, but serial NOT marked!
    // Database is now inconsistent:
    // - AGS record has eyefi-007
    // - eyefi-007 still shows as 'available'
    // - Another user could assign eyefi-007 to a different asset!
}
```

## The Solution

### 1. Stored Procedures with Transactions

The stored procedures now include transaction handling:

```sql
CREATE PROCEDURE mark_eyefi_serial_used(...)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;  -- Roll back on any error
        SELECT 0 as success, 'Error marking serial as used' as message;
    END;
    
    START TRANSACTION;
    
    -- Check if serial exists
    IF NOT EXISTS (...) THEN
        ROLLBACK;
        SELECT 0 as success, 'Serial number not found' as message;
    ELSE
        -- Update serial status
        UPDATE eyefi_serial_numbers ...
        
        COMMIT;  -- Commit on success
        SELECT 1 as success, 'Serial marked as assigned' as message;
    END IF;
END
```

### 2. PHP Helper Class with Transaction Wrappers

The `EyeFiSerialHelper` class includes methods that wrap both operations in a single transaction:

#### For CREATE operations:
```php
$result = $eyefiHelper->transactionalSaveWithSerial(
    // Callback that saves the record
    function($pdo) use ($data) {
        $stmt = $pdo->prepare("INSERT INTO ags_serial (...) VALUES (...)");
        $stmt->execute([...]);
        return ['success' => true, 'id' => $pdo->lastInsertId()];
    },
    $data['serialNumber'],  // Serial to mark
    'ags_serial',           // Table name
    $agsId                  // Will be set to new ID
);

// If $result['success'] is true:
//   ✅ AGS record created
//   ✅ Serial marked as 'assigned'
//
// If $result['success'] is false:
//   ✅ Nothing was saved (complete rollback)
//   ✅ Database remains consistent
```

#### For DELETE operations:
```php
$result = $eyefiHelper->transactionalDeleteWithSerial(
    // Callback that deletes the record
    function($pdo) use ($agsId) {
        $stmt = $pdo->prepare("DELETE FROM ags_serial WHERE id = ?");
        $stmt->execute([$agsId]);
        return ['success' => true];
    },
    $record['serialNumber'],  // Serial to release
    'ags_serial',
    $agsId
);

// If $result['success'] is true:
//   ✅ AGS record deleted
//   ✅ Serial marked as 'available'
//
// If $result['success'] is false:
//   ✅ Nothing was deleted (complete rollback)
//   ✅ Serial status unchanged
```

## What Happens on Failure

### Scenario 1: Serial Doesn't Exist

```php
// Try to create AGS with non-existent serial
$result = $eyefiHelper->transactionalSaveWithSerial(
    function($pdo) {
        $stmt = $pdo->prepare("INSERT INTO ags_serial (serialNumber) VALUES (?)");
        $stmt->execute(['eyefi-INVALID']);
        return ['success' => true, 'id' => $pdo->lastInsertId()];
    },
    'eyefi-INVALID',  // This serial doesn't exist
    'ags_serial',
    $agsId
);

// Result:
// - $result['success'] = false
// - $result['message'] = 'Failed to mark EyeFi serial: Serial number not found'
// - AGS record was NOT saved (rolled back)
// - Database is consistent ✅
```

### Scenario 2: Database Error During Save

```php
$result = $eyefiHelper->transactionalSaveWithSerial(
    function($pdo) {
        // This will fail (duplicate key, constraint violation, etc.)
        $stmt = $pdo->prepare("INSERT INTO ags_serial (id, serialNumber) VALUES (?, ?)");
        $stmt->execute([999, 'eyefi-007']);  // ID 999 already exists
        return ['success' => true, 'id' => 999];
    },
    'eyefi-007',
    'ags_serial',
    $agsId
);

// Result:
// - Exception caught by helper class
// - Transaction rolled back
// - $result['success'] = false
// - Serial status unchanged ✅
```

### Scenario 3: Database Error During Serial Marking

```php
$result = $eyefiHelper->transactionalSaveWithSerial(
    function($pdo) {
        $stmt = $pdo->prepare("INSERT INTO ags_serial (serialNumber) VALUES (?)");
        $stmt->execute(['eyefi-007']);
        return ['success' => true, 'id' => $pdo->lastInsertId()];
    },
    'eyefi-007',
    'ags_serial',
    $agsId
);

// If marking serial fails (procedure returns success=0):
// - Entire transaction rolled back
// - AGS record NOT saved
// - $result['success'] = false
// - Database is consistent ✅
```

## Transaction Flow

### Successful Flow

```
1. PHP: BEGIN TRANSACTION
2. PHP: Execute INSERT/UPDATE (AGS record saved in memory, not committed)
3. PHP: Call stored procedure mark_eyefi_serial_used
4. MySQL: BEGIN TRANSACTION (in procedure)
5. MySQL: Check if serial exists ✅
6. MySQL: UPDATE eyefi_serial_numbers (status='assigned')
7. MySQL: COMMIT (procedure transaction)
8. PHP: Check procedure result ✅
9. PHP: COMMIT (outer transaction)
10. Result: Both operations committed together ✅
```

### Failed Flow (Serial Not Found)

```
1. PHP: BEGIN TRANSACTION
2. PHP: Execute INSERT/UPDATE (AGS record saved in memory, not committed)
3. PHP: Call stored procedure mark_eyefi_serial_used
4. MySQL: BEGIN TRANSACTION (in procedure)
5. MySQL: Check if serial exists ❌
6. MySQL: ROLLBACK (procedure transaction)
7. PHP: Check procedure result ❌
8. PHP: ROLLBACK (outer transaction)
9. Result: Nothing saved, database consistent ✅
```

### Failed Flow (Database Error)

```
1. PHP: BEGIN TRANSACTION
2. PHP: Execute INSERT/UPDATE
3. PHP: Exception thrown (duplicate key, etc.)
4. PHP: Catch exception in helper class
5. PHP: ROLLBACK (outer transaction)
6. Result: Nothing saved, database consistent ✅
```

## Testing Transaction Rollback

### Test 1: Invalid Serial

```php
$result = $eyefiHelper->transactionalSaveWithSerial(
    function($pdo) {
        $stmt = $pdo->prepare("INSERT INTO ags_serial (serialNumber) VALUES (?)");
        $stmt->execute(['eyefi-INVALID']);
        return ['success' => true, 'id' => $pdo->lastInsertId()];
    },
    'eyefi-INVALID',
    'ags_serial',
    $agsId
);

// Verify rollback
$stmt = $pdo->prepare("SELECT COUNT(*) FROM ags_serial WHERE serialNumber = 'eyefi-INVALID'");
$stmt->execute();
echo $stmt->fetchColumn() === 0 ? "✅ Rolled back correctly" : "❌ Still in database";
```

### Test 2: Serial Already Assigned

```php
// First, mark a serial as assigned
$eyefiHelper->markUsed('eyefi-007', 'test', 1);

// Try to create AGS with same serial
$result = $eyefiHelper->transactionalSaveWithSerial(
    function($pdo) {
        $stmt = $pdo->prepare("INSERT INTO ags_serial (serialNumber) VALUES (?)");
        $stmt->execute(['eyefi-007']);
        return ['success' => true, 'id' => $pdo->lastInsertId()];
    },
    'eyefi-007',  // Already assigned
    'ags_serial',
    $agsId
);

// Should succeed (procedure doesn't check current status)
// But frontend validation should prevent this
```

### Test 3: Database Connection Lost

```php
try {
    $result = $eyefiHelper->transactionalSaveWithSerial(
        function($pdo) {
            $stmt = $pdo->prepare("INSERT INTO ags_serial (serialNumber) VALUES (?)");
            $stmt->execute(['eyefi-007']);
            
            // Simulate connection loss
            throw new PDOException("Lost connection");
            
            return ['success' => true, 'id' => $pdo->lastInsertId()];
        },
        'eyefi-007',
        'ags_serial',
        $agsId
    );
} catch (Exception $e) {
    echo "Exception caught: " . $e->getMessage();
}

// Transaction automatically rolled back ✅
```

## Best Practices

### ✅ DO:

1. **Always use transactional methods for CREATE/DELETE**
   ```php
   $result = $eyefiHelper->transactionalSaveWithSerial(...);
   ```

2. **Check the result before returning to frontend**
   ```php
   if (!$result['success']) {
       return json_encode(['error' => $result['message']]);
   }
   ```

3. **Log failures for debugging**
   ```php
   if (!$result['success']) {
       error_log("Failed to create AGS: {$result['message']}");
   }
   ```

4. **Validate serial availability in frontend** (before save)
   ```typescript
   // In Angular component
   if (serial.status !== 'available') {
       this.errorMessage = 'Serial is not available';
       return;
   }
   ```

5. **Add database-level checks** (optional but recommended)
   ```sql
   -- Add check constraint to ensure serial is available
   ALTER TABLE ags_serial ADD CONSTRAINT check_eyefi_available
   CHECK (serialNumber IN (
       SELECT serial_number FROM eyefi_serial_numbers WHERE status = 'available'
   ));
   ```

### ❌ DON'T:

1. **Don't save record and mark serial in separate calls** (not transactional)
   ```php
   // ❌ BAD: Two separate operations
   $stmt = $pdo->prepare("INSERT INTO ags_serial ...");
   $stmt->execute([...]);
   $eyefiHelper->markUsed(...);  // If this fails, AGS already saved!
   ```

2. **Don't ignore the result**
   ```php
   // ❌ BAD: Not checking result
   $eyefiHelper->markUsed('eyefi-007', 'ags_serial', $agsId);
   // What if it failed?
   ```

3. **Don't assume serial is available** (always validate)
   ```php
   // ❌ BAD: No validation
   $stmt = $pdo->prepare("INSERT INTO ags_serial (serialNumber) VALUES (?)");
   $stmt->execute([$data['serialNumber']]);  // Could be already assigned!
   ```

## Database Configuration

Ensure your MySQL configuration supports transactions:

```sql
-- Check storage engine (must be InnoDB)
SHOW TABLE STATUS WHERE Name = 'ags_serial';
SHOW TABLE STATUS WHERE Name = 'eyefi_serial_numbers';

-- If MyISAM, convert to InnoDB
ALTER TABLE ags_serial ENGINE=InnoDB;
ALTER TABLE eyefi_serial_numbers ENGINE=InnoDB;

-- Check transaction isolation level
SELECT @@transaction_ISOLATION;

-- Set isolation level if needed (default is REPEATABLE-READ)
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Summary

### Without Transactions (❌ Bad)
- Save record → success
- Mark serial → **fails**
- **Result:** Database inconsistent, serial still shows as available

### With Transactions (✅ Good)
- Begin transaction
- Save record → success (not committed yet)
- Mark serial → **fails**
- Rollback transaction
- **Result:** Nothing saved, database consistent

### The Key Benefit
**Atomicity**: Both operations succeed together, or both fail together. No partial saves!

## Migration Path

If you already have AGS records with EyeFi serials:

```sql
-- 1. Check for inconsistencies
SELECT a.serialNumber, e.status
FROM ags_serial a
LEFT JOIN eyefi_serial_numbers e ON a.serialNumber = e.serial_number
WHERE a.serialNumber IS NOT NULL
  AND (e.status IS NULL OR e.status != 'assigned');

-- 2. Fix inconsistencies
UPDATE eyefi_serial_numbers e
INNER JOIN ags_serial a ON e.serial_number = a.serialNumber
SET e.status = 'assigned',
    e.last_assigned_at = NOW()
WHERE e.status != 'assigned';

-- 3. Verify
SELECT COUNT(*) FROM ags_serial WHERE serialNumber IS NOT NULL;
SELECT COUNT(*) FROM eyefi_serial_numbers WHERE status = 'assigned';
-- These counts should match
```

## Conclusion

**The transactional approach ensures:**
- ✅ Data consistency (no partial saves)
- ✅ Easier debugging (clear error messages)
- ✅ Safe rollback (automatic on any failure)
- ✅ Production-ready (handles edge cases)

**Use the helper class methods:**
- `transactionalSaveWithSerial()` for CREATE/UPDATE
- `transactionalDeleteWithSerial()` for DELETE
- Both methods handle transactions automatically!
