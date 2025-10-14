-- =====================================================
-- EyeFi Serial Number Tracking - Option 3: Stored Procedures
-- Simple, Explicit, Debuggable Approach
-- =====================================================

-- This approach uses stored procedures that you call explicitly
-- from your backend PHP code when assigning/releasing serials.
-- No triggers, no automatic behavior, full control.

-- =====================================================
-- Procedure 1: Mark Serial as Used
-- =====================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS mark_eyefi_serial_used$$

CREATE PROCEDURE mark_eyefi_serial_used(
    IN p_serial_number VARCHAR(50),
    IN p_source_table VARCHAR(50),    -- 'ags_serial', 'ul_label_usages', 'igt_assets', etc.
    IN p_source_id INT,                -- The ID of the record using this serial
    IN p_assigned_by VARCHAR(100)      -- Username of person assigning (optional)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Rollback on any error
        ROLLBACK;
        SELECT 0 as success, 'Error marking serial as used' as message;
    END;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Check if serial exists and is active
    IF NOT EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = p_serial_number AND is_active = 1) THEN
        -- Serial doesn't exist or is inactive
        ROLLBACK;
        SELECT 0 as success, 'Serial number not found or inactive' as message;
    ELSE
        -- Update status to assigned
        UPDATE eyefi_serial_numbers 
        SET 
            status = 'assigned',
            assigned_at = NOW(),
            assigned_by = COALESCE(p_assigned_by, assigned_by),
            updated_at = NOW()
        WHERE serial_number = p_serial_number;
        
        -- Optional: Log the assignment (if you create a history table)
        -- INSERT INTO eyefi_serial_usage_history (serial_number, source_table, source_id, action)
        -- VALUES (p_serial_number, p_source_table, p_source_id, 'assigned');
        
        -- Commit transaction
        COMMIT;
        
        -- Return success
        SELECT 1 as success, 'Serial marked as assigned' as message;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- Procedure 2: Mark Serial as Available (Released)
-- =====================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS mark_eyefi_serial_available$$

CREATE PROCEDURE mark_eyefi_serial_available(
    IN p_serial_number VARCHAR(50),
    IN p_source_table VARCHAR(50),    -- For logging purposes
    IN p_source_id INT,                -- For logging purposes
    IN p_updated_by VARCHAR(100)       -- Username of person releasing (optional)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Rollback on any error
        ROLLBACK;
        SELECT 0 as success, 'Error marking serial as available' as message;
    END;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Check if serial exists
    IF NOT EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = p_serial_number) THEN
        -- Serial doesn't exist
        ROLLBACK;
        SELECT 0 as success, 'Serial number not found' as message;
    ELSE
        -- Update status to available (clear assignment info)
        UPDATE eyefi_serial_numbers 
        SET 
            status = 'available',
            updated_at = NOW(),
            updated_by = COALESCE(p_updated_by, updated_by)
        WHERE serial_number = p_serial_number;
        
        -- Optional: Log the release
        -- INSERT INTO eyefi_serial_usage_history (serial_number, source_table, source_id, action)
        -- VALUES (p_serial_number, p_source_table, p_source_id, 'released');
        
        -- Commit transaction
        COMMIT;
        
        -- Return success
        SELECT 1 as success, 'Serial marked as available' as message;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- Procedure 3: Check Where Serial is Used
-- =====================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS check_eyefi_serial_usage$$

CREATE PROCEDURE check_eyefi_serial_usage(
    IN p_serial_number VARCHAR(50)
)
BEGIN
    -- Return all places where this serial is used
    SELECT 'ags_serial' as source_table, id, serialNumber as serial, created_at
    FROM ags_serial 
    WHERE serialNumber = p_serial_number
    
    UNION ALL
    
    SELECT 'ul_label_usages' as source_table, id, eyefi_serial_number, date_used
    FROM ul_label_usages 
    WHERE eyefi_serial_number = p_serial_number
    
    UNION ALL
    
    SELECT 'igt_assets' as source_table, id, eyefi_serial_number, created_at
    FROM igt_assets 
    WHERE eyefi_serial_number = p_serial_number;
END$$

DELIMITER ;

-- =====================================================
-- Test the Procedures
-- =====================================================

-- Test 1: Mark a serial as used
CALL mark_eyefi_serial_used('eyefi-007', 'ags_serial', 123);

-- Test 2: Check the serial status
SELECT serial_number, status, last_assigned_at 
FROM eyefi_serial_numbers 
WHERE serial_number = 'eyefi-007';

-- Test 3: Check where the serial is used
CALL check_eyefi_serial_usage('eyefi-007');

-- Test 4: Mark the serial as available again
CALL mark_eyefi_serial_available('eyefi-007', 'ags_serial', 123);

-- Test 5: Verify status changed
SELECT serial_number, status, updated_at 
FROM eyefi_serial_numbers 
WHERE serial_number = 'eyefi-007';

-- =====================================================
-- Verification
-- =====================================================

-- List all stored procedures
SELECT ROUTINE_NAME, ROUTINE_TYPE 
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_NAME LIKE '%eyefi%'
ORDER BY ROUTINE_NAME;

-- Show procedure definition
SHOW CREATE PROCEDURE mark_eyefi_serial_used;
SHOW CREATE PROCEDURE mark_eyefi_serial_available;
SHOW CREATE PROCEDURE check_eyefi_serial_usage;
