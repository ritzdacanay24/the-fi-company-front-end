-- =====================================================
-- EyeFi Serial Number Tracking - Triggers for IGT Assets (SIMPLIFIED)
-- Table: igt_assets
-- Column: eyefi_serial_number
-- =====================================================
-- This is the SIMPLIFIED version - easier to maintain, just as effective
-- Uses UNIQUE constraint for duplicate prevention instead of complex trigger logic
-- =====================================================

-- Step 0: Backup Note
-- IMPORTANT: Always backup your database before running migrations!
-- mysqldump -u username -p database_name igt_assets > backup_igt_before_triggers.sql

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
UPDATE igt_assets 
SET eyefi_serial_number = NULL 
WHERE eyefi_serial_number = '' OR TRIM(eyefi_serial_number) = '';

-- Add UNIQUE constraint to prevent duplicate EyeFi serial assignments
-- Note: NULL values are allowed and don't count as duplicates
-- The UNIQUE constraint handles all duplicate prevention automatically
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'igt_assets' 
    AND CONSTRAINT_NAME = 'unique_igt_eyefi_serial'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE igt_assets ADD CONSTRAINT unique_igt_eyefi_serial UNIQUE (eyefi_serial_number(255));',
    'SELECT ''Constraint already exists'' AS message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional: Add index for performance (only if it doesn't already exist)
-- ALTER TABLE igt_assets ADD INDEX idx_igt_eyefi_serial (eyefi_serial_number(255));

-- =============================================
-- PART 2: CREATE TRIGGERS (Simple Tracking Only)
-- =============================================

DELIMITER $$

-- =============================================
-- Trigger 1: AFTER INSERT
-- Marks EyeFi serial as "assigned" when new IGT asset is created
-- =============================================
DROP TRIGGER IF EXISTS mark_eyefi_used_igt_insert$$

CREATE TRIGGER mark_eyefi_used_igt_insert
AFTER INSERT ON igt_assets
FOR EACH ROW
BEGIN
    DECLARE v_user_name VARCHAR(255);
    
    -- Only process if eyefi_serial_number is provided
    IF NEW.eyefi_serial_number IS NOT NULL AND TRIM(NEW.eyefi_serial_number) != '' THEN
        
        -- Get user name if created_by is provided
        IF NEW.created_by IS NOT NULL AND NEW.created_by != '' THEN
            -- Try to parse created_by as numeric ID or use as-is if it's already a name
            IF NEW.created_by REGEXP '^[0-9]+$' THEN
                SELECT CONCAT(first, ' ', last) INTO v_user_name
                FROM db.users WHERE id = CAST(NEW.created_by AS UNSIGNED);
            ELSE
                SET v_user_name = NEW.created_by;
            END IF;
        END IF;
        
        -- Update the serial number status (if it exists in master table)
        UPDATE eyefi_serial_numbers
        SET 
            status = 'assigned',
            assigned_by = v_user_name,
            assigned_at = NOW(),
            assigned_to_table = 'igt_assets',
            assigned_to_id = NEW.id
        WHERE serial_number = NEW.eyefi_serial_number;
        
    END IF;
END$$

-- =============================================
-- Trigger 2: AFTER UPDATE
-- Handles changes to the EyeFi serial number
-- =============================================
DROP TRIGGER IF EXISTS mark_eyefi_used_igt_update$$

CREATE TRIGGER mark_eyefi_used_igt_update
AFTER UPDATE ON igt_assets
FOR EACH ROW
BEGIN
    DECLARE v_user_name VARCHAR(255);
    
    -- Get user name from created_by or updated_by
    IF NEW.updated_by IS NOT NULL AND NEW.updated_by != '' THEN
        -- Try to parse as numeric ID or use as-is
        IF NEW.updated_by REGEXP '^[0-9]+$' THEN
            SELECT CONCAT(first, ' ', last) INTO v_user_name
            FROM db.users WHERE id = CAST(NEW.updated_by AS UNSIGNED);
        ELSE
            SET v_user_name = NEW.updated_by;
        END IF;
    ELSEIF NEW.created_by IS NOT NULL AND NEW.created_by != '' THEN
        IF NEW.created_by REGEXP '^[0-9]+$' THEN
            SELECT CONCAT(first, ' ', last) INTO v_user_name
            FROM db.users WHERE id = CAST(NEW.created_by AS UNSIGNED);
        ELSE
            SET v_user_name = NEW.created_by;
        END IF;
    END IF;
    
    -- Case 1: Serial number was removed (set to NULL or empty)
    IF (OLD.eyefi_serial_number IS NOT NULL AND TRIM(OLD.eyefi_serial_number) != '') 
       AND (NEW.eyefi_serial_number IS NULL OR TRIM(NEW.eyefi_serial_number) = '') THEN
        
        -- Mark old serial as available again
        UPDATE eyefi_serial_numbers
        SET 
            status = 'available',
            assigned_by = NULL,
            assigned_at = NULL,
            assigned_to_table = NULL,
            assigned_to_id = NULL
        WHERE serial_number = OLD.eyefi_serial_number;
    
    -- Case 2: Serial number was changed to a different value
    ELSEIF (OLD.eyefi_serial_number IS NOT NULL AND TRIM(OLD.eyefi_serial_number) != '') 
           AND (NEW.eyefi_serial_number IS NOT NULL AND TRIM(NEW.eyefi_serial_number) != '')
           AND OLD.eyefi_serial_number != NEW.eyefi_serial_number THEN
        
        -- Release the old serial
        UPDATE eyefi_serial_numbers
        SET 
            status = 'available',
            assigned_by = NULL,
            assigned_at = NULL,
            assigned_to_table = NULL,
            assigned_to_id = NULL
        WHERE serial_number = OLD.eyefi_serial_number;
        
        -- Assign the new serial
        UPDATE eyefi_serial_numbers
        SET 
            status = 'assigned',
            assigned_by = v_user_name,
            assigned_at = NOW(),
            assigned_to_table = 'igt_assets',
            assigned_to_id = NEW.id
        WHERE serial_number = NEW.eyefi_serial_number;
    
    -- Case 3: Serial was added (was NULL, now has value)
    ELSEIF (OLD.eyefi_serial_number IS NULL OR TRIM(OLD.eyefi_serial_number) = '')
           AND (NEW.eyefi_serial_number IS NOT NULL AND TRIM(NEW.eyefi_serial_number) != '') THEN
        
        -- Assign the new serial
        UPDATE eyefi_serial_numbers
        SET 
            status = 'assigned',
            assigned_by = v_user_name,
            assigned_at = NOW(),
            assigned_to_table = 'igt_assets',
            assigned_to_id = NEW.id
        WHERE serial_number = NEW.eyefi_serial_number;
        
    END IF;
END$$

-- =============================================
-- Trigger 3: AFTER DELETE
-- Releases EyeFi serial when IGT asset is deleted
-- =============================================
DROP TRIGGER IF EXISTS mark_eyefi_released_igt_delete$$

CREATE TRIGGER mark_eyefi_released_igt_delete
AFTER DELETE ON igt_assets
FOR EACH ROW
BEGIN
    -- Only process if eyefi_serial_number was set
    IF OLD.eyefi_serial_number IS NOT NULL AND TRIM(OLD.eyefi_serial_number) != '' THEN
        
        -- Mark serial as available again
        UPDATE eyefi_serial_numbers
        SET 
            status = 'available',
            assigned_by = NULL,
            assigned_at = NULL,
            assigned_to_table = NULL,
            assigned_to_id = NULL
        WHERE serial_number = OLD.eyefi_serial_number;
        
    END IF;
END$$

DELIMITER ;

-- =============================================
-- PART 3: Backfill Existing Records
-- =============================================
-- Mark existing IGT assets' serials as assigned
-- This ensures historical data is properly tracked

UPDATE eyefi_serial_numbers esn
INNER JOIN igt_assets igt ON esn.serial_number = igt.eyefi_serial_number
LEFT JOIN db.users u ON (
    CASE 
        WHEN igt.created_by REGEXP '^[0-9]+$' THEN u.id = CAST(igt.created_by AS UNSIGNED)
        ELSE FALSE
    END
)
SET 
    esn.status = 'assigned',
    esn.assigned_by = COALESCE(CONCAT(u.first, ' ', u.last), igt.created_by),
    esn.assigned_at = igt.created_at,
    esn.assigned_to_table = 'igt_assets',
    esn.assigned_to_id = igt.id
WHERE esn.serial_number IS NOT NULL 
  AND TRIM(esn.serial_number) != '';

-- =============================================
-- PART 4: Verification Queries
-- =============================================
-- Run these queries to verify the triggers are working:

-- 1. Check triggers were created
-- SHOW TRIGGERS WHERE `Table` = 'igt_assets';

-- 2. Check for any duplicate serials (should return 0 rows after constraint)
-- SELECT eyefi_serial_number, COUNT(*) as count 
-- FROM igt_assets 
-- WHERE eyefi_serial_number IS NOT NULL 
-- GROUP BY eyefi_serial_number 
-- HAVING count > 1;

-- 3. View assigned serials
-- SELECT esn.serial_number, esn.status, esn.assigned_to_table, esn.assigned_to_id, esn.assigned_by
-- FROM eyefi_serial_numbers esn
-- WHERE esn.assigned_to_table = 'igt_assets';

-- 4. Test insert (should mark serial as assigned)
-- INSERT INTO igt_assets (serial_number, eyefi_serial_number, created_by) 
-- VALUES ('IGT-TEST-001', 'EF-TEST-001', '1');

-- 5. Test update (should release old and assign new)
-- UPDATE igt_assets 
-- SET eyefi_serial_number = 'EF-TEST-002' 
-- WHERE serial_number = 'IGT-TEST-001';

-- 6. Test delete (should release serial)
-- DELETE FROM igt_assets WHERE serial_number = 'IGT-TEST-001';

-- =============================================
-- How This Works - Simplified Approach:
-- =============================================
-- UNIQUE Constraint: Prevents duplicates atomically
--   - Faster than trigger checks
--   - No race conditions possible
--   - Works for INSERT and UPDATE
--   - MySQL error: "Duplicate entry 'XXX' for key 'unique_igt_eyefi_serial'"
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
-- "Duplicate entry 'XXX' for key 'unique_igt_eyefi_serial'"
-- 
-- And display a user-friendly message like:
-- "EyeFi serial 'XXX' is already in use. Please select a different serial."
-- =============================================

-- =============================================
-- Table Structure Reference (igt_assets):
-- =============================================
-- id                    - Primary key (BIGINT AUTO_INCREMENT)
-- generated_IGT_asset   - Auto-generated IGT asset number
-- serial_number         - IGT serial number (NOT NULL)
-- eyefi_serial_number   - EyeFi serial (TEXT) - THIS is what we track
-- time_stamp            - Creation timestamp
-- wo_number             - Work order number
-- property_site         - Gaming facility/casino
-- igt_part_number       - Customer IGT part reference
-- eyefi_part_number     - Internal Eyefi part reference
-- inspector_name        - QA inspector
-- last_update           - Last update timestamp
-- active                - Active status (TINYINT DEFAULT 1)
-- manual_update         - Manual notes (TEXT)
-- created_by            - User who created (VARCHAR)
-- created_at            - Creation timestamp
-- updated_at            - Last update timestamp
-- updated_by            - User who updated (VARCHAR)
-- serial_number_id      - Reference to preloaded serial (BIGINT)
-- notes                 - Additional notes (VARCHAR 50)
-- wo_part               - Work order part number
-- wo_description        - Work order description (TEXT)
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
-- 7. Compatible with existing igt_list structure
-- =============================================
