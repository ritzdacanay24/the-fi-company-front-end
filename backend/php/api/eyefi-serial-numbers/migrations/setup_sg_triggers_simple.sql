-- =====================================================
-- EyeFi Serial Number Tracking - Triggers for SG Assets (SIMPLIFIED)
-- Table: sgAssetGenerator
-- Column: serialNumber
-- =====================================================
-- This is the SIMPLIFIED version - easier to maintain, just as effective
-- Uses UNIQUE constraint for duplicate prevention instead of complex trigger logic
-- =====================================================

-- Step 0: Backup Note
-- IMPORTANT: Always backup your database before running migrations!
-- mysqldump -u username -p database_name sgAssetGenerator > backup_sg_before_triggers.sql

-- =============================================
-- PREREQUISITE: eyefi_serial_numbers must have these columns:
-- - assigned_to_table VARCHAR(100)
-- - assigned_to_id BIGINT(20)
-- - assigned_by VARCHAR(255)
-- - assigned_at DATETIME
-- 
-- If missing, run: 00_add_columns_first.sql FIRST
-- =============================================

-- =============================================
-- PART 1: Data Cleanup and Constraints
-- =============================================

-- Clean up empty strings (convert to NULL for consistency)
UPDATE sgAssetGenerator 
SET serialNumber = NULL 
WHERE serialNumber = '' OR TRIM(serialNumber) = '';

-- Add UNIQUE constraint to prevent duplicate EyeFi serial assignments
-- Note: NULL values are allowed and don't count as duplicates
-- The UNIQUE constraint handles all duplicate prevention automatically
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sgAssetGenerator' 
    AND CONSTRAINT_NAME = 'unique_sg_eyefi_serial'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE sgAssetGenerator ADD CONSTRAINT unique_sg_eyefi_serial UNIQUE (serialNumber);',
    'SELECT ''Constraint already exists'' AS message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional: Add index for performance (only if it doesn't already exist)
-- ALTER TABLE sgAssetGenerator ADD INDEX idx_sg_eyefi_serial (serialNumber);

-- =============================================
-- PART 2: CREATE TRIGGERS (Simple Tracking Only)
-- =============================================

DELIMITER $$

-- =============================================
-- Trigger 1: AFTER INSERT
-- Marks EyeFi serial as "assigned" when new SG asset is created
-- =============================================
DROP TRIGGER IF EXISTS mark_eyefi_used_sg_insert$$

CREATE TRIGGER mark_eyefi_used_sg_insert
AFTER INSERT ON sgAssetGenerator
FOR EACH ROW
BEGIN
    DECLARE v_user_name VARCHAR(255);
    
    -- Only process if serialNumber is provided
    IF NEW.serialNumber IS NOT NULL AND TRIM(NEW.serialNumber) != '' THEN
        
        -- Get user name if created_by is provided
        IF NEW.created_by IS NOT NULL AND NEW.created_by > 0 THEN
            SELECT CONCAT(first, ' ', last) INTO v_user_name
            FROM db.users WHERE id = NEW.created_by;
        END IF;
        
        -- Update the serial number status (if it exists in master table)
        UPDATE eyefi_serial_numbers
        SET 
            status = 'assigned',
            assigned_by = v_user_name,
            assigned_at = NOW(),
            assigned_to_table = 'sgAssetGenerator',
            assigned_to_id = NEW.id
        WHERE serial_number = NEW.serialNumber;
        
    END IF;
END$$

-- =============================================
-- Trigger 2: AFTER UPDATE
-- Handles changes to the EyeFi serial number
-- =============================================
DROP TRIGGER IF EXISTS mark_eyefi_used_sg_update$$

CREATE TRIGGER mark_eyefi_used_sg_update
AFTER UPDATE ON sgAssetGenerator
FOR EACH ROW
BEGIN
    DECLARE v_user_name VARCHAR(255);
    
    -- Get user name from created_by
    IF NEW.created_by IS NOT NULL AND NEW.created_by > 0 THEN
        SELECT CONCAT(first, ' ', last) INTO v_user_name
        FROM db.users 
        WHERE id = NEW.created_by;
    END IF;
    
    -- Case 1: Serial number was removed (set to NULL or empty)
    IF (OLD.serialNumber IS NOT NULL AND TRIM(OLD.serialNumber) != '') 
       AND (NEW.serialNumber IS NULL OR TRIM(NEW.serialNumber) = '') THEN
        
        -- Mark old serial as available again
        UPDATE eyefi_serial_numbers
        SET 
            status = 'available',
            assigned_by = NULL,
            assigned_at = NULL,
            assigned_to_table = NULL,
            assigned_to_id = NULL
        WHERE serial_number = OLD.serialNumber;
    
    -- Case 2: Serial number was changed to a different value
    ELSEIF (OLD.serialNumber IS NOT NULL AND TRIM(OLD.serialNumber) != '') 
           AND (NEW.serialNumber IS NOT NULL AND TRIM(NEW.serialNumber) != '')
           AND OLD.serialNumber != NEW.serialNumber THEN
        
        -- Release the old serial
        UPDATE eyefi_serial_numbers
        SET 
            status = 'available',
            assigned_by = NULL,
            assigned_at = NULL,
            assigned_to_table = NULL,
            assigned_to_id = NULL
        WHERE serial_number = OLD.serialNumber;
        
        -- Assign the new serial
        UPDATE eyefi_serial_numbers
        SET 
            status = 'assigned',
            assigned_by = v_user_name,
            assigned_at = NOW(),
            assigned_to_table = 'sgAssetGenerator',
            assigned_to_id = NEW.id
        WHERE serial_number = NEW.serialNumber;
    
    -- Case 3: Serial was added (was NULL, now has value)
    ELSEIF (OLD.serialNumber IS NULL OR TRIM(OLD.serialNumber) = '')
           AND (NEW.serialNumber IS NOT NULL AND TRIM(NEW.serialNumber) != '') THEN
        
        -- Assign the new serial
        UPDATE eyefi_serial_numbers
        SET 
            status = 'assigned',
            assigned_by = v_user_name,
            assigned_at = NOW(),
            assigned_to_table = 'sgAssetGenerator',
            assigned_to_id = NEW.id
        WHERE serial_number = NEW.serialNumber;
        
    END IF;
END$$

-- =============================================
-- Trigger 3: AFTER DELETE
-- Releases EyeFi serial when SG asset is deleted
-- =============================================
DROP TRIGGER IF EXISTS mark_eyefi_released_sg_delete$$

CREATE TRIGGER mark_eyefi_released_sg_delete
AFTER DELETE ON sgAssetGenerator
FOR EACH ROW
BEGIN
    -- Only process if serialNumber was set
    IF OLD.serialNumber IS NOT NULL AND TRIM(OLD.serialNumber) != '' THEN
        
        -- Mark serial as available again
        UPDATE eyefi_serial_numbers
        SET 
            status = 'available',
            assigned_by = NULL,
            assigned_at = NULL,
            assigned_to_table = NULL,
            assigned_to_id = NULL
        WHERE serial_number = OLD.serialNumber;
        
    END IF;
END$$

DELIMITER ;

-- =============================================
-- PART 3: Backfill Existing Records
-- =============================================
-- Mark existing SG assets' serials as assigned
-- This ensures historical data is properly tracked

UPDATE eyefi_serial_numbers esn
INNER JOIN sgAssetGenerator sg ON esn.serial_number = sg.serialNumber
LEFT JOIN db.users u ON sg.created_by = u.id
SET 
    esn.status = 'assigned',
    esn.assigned_by = CONCAT(u.first, ' ', u.last),
    esn.assigned_at = sg.timeStamp,
    esn.assigned_to_table = 'sgAssetGenerator',
    esn.assigned_to_id = sg.id
WHERE esn.serial_number IS NOT NULL 
  AND TRIM(esn.serial_number) != '';

-- =============================================
-- PART 4: Verification Queries
-- =============================================
-- Run these queries to verify the triggers are working:

-- 1. Check triggers were created
-- SHOW TRIGGERS WHERE `Table` = 'sgAssetGenerator';

-- 2. Check for any duplicate serials (should return 0 rows after constraint)
-- SELECT serialNumber, COUNT(*) as count 
-- FROM sgAssetGenerator 
-- WHERE serialNumber IS NOT NULL 
-- GROUP BY serialNumber 
-- HAVING count > 1;

-- 3. View assigned serials
-- SELECT esn.serial_number, esn.status, esn.assigned_to_table, esn.assigned_to_id, esn.assigned_by
-- FROM eyefi_serial_numbers esn
-- WHERE esn.assigned_to_table = 'sgAssetGenerator';

-- =============================================
-- How This Works - Simplified Approach:
-- =============================================
-- UNIQUE Constraint: Prevents duplicates atomically
--   - Faster than trigger checks
--   - No race conditions possible
--   - Works for INSERT and UPDATE
--   - MySQL error: "Duplicate entry 'XXX' for key 'unique_sg_eyefi_serial'"
--
-- AFTER INSERT: Marks serial as assigned in tracking table
--   - Only runs after successful insert
--   - Records who assigned it and when
--
-- AFTER UPDATE: Handles serial number changes
--   - Releases old serial (if changed)
--   - Assigns new serial (if changed)
--
-- AFTER DELETE: Releases serial back to available pool
--   - Automatic cleanup when record deleted
-- =============================================

-- =============================================
-- Error Handling in Frontend:
-- =============================================
-- The frontend should catch the MySQL UNIQUE constraint error:
-- "Duplicate entry 'XXX' for key 'unique_sg_eyefi_serial'"
-- 
-- And display a user-friendly message like:
-- "EyeFi serial 'XXX' is already in use. Please select a different serial."
-- =============================================

-- =============================================
-- NOTES:
-- =============================================
-- 1. MUCH simpler than complex BEFORE INSERT validation
-- 2. UNIQUE constraint handles all duplicate prevention
-- 3. Triggers only handle tracking (status updates)
-- 4. Less code = easier to maintain
-- 5. Just as effective as the complex version
-- 6. Frontend handles user-friendly error display
-- =============================================
