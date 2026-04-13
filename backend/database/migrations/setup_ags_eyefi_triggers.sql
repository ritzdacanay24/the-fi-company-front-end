-- =====================================================
-- EyeFi Serial Number Tracking - Triggers for AGS
-- Table: agsSerialGenerator
-- Column: serialNumber
-- =====================================================

-- This migration sets up automatic tracking of EyeFi serial numbers
-- used in the AGS (agsSerialGenerator) table via database triggers.

-- Step 1: Add Foreign Key Constraint (Optional but recommended)
-- This ensures data integrity - serial numbers must exist in eyefi_serial_numbers
ALTER TABLE agsSerialGenerator 
ADD CONSTRAINT fk_ags_eyefi_serial 
    FOREIGN KEY (serialNumber) 
    REFERENCES eyefi_serial_numbers(serial_number) 
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Step 2: Add Index for Performance
CREATE INDEX idx_ags_eyefi_serial ON agsSerialGenerator(serialNumber);

-- Step 3: Create Trigger - Mark Serial as "Assigned" on INSERT
DELIMITER $$

DROP TRIGGER IF EXISTS mark_eyefi_used_ags_insert$$

CREATE TRIGGER mark_eyefi_used_ags_insert
AFTER INSERT ON agsSerialGenerator
FOR EACH ROW
BEGIN
    IF NEW.serialNumber IS NOT NULL THEN
        -- Check if serial exists in eyefi_serial_numbers table
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = NEW.serialNumber) THEN
            -- Update status to 'assigned' with timestamp and user
            UPDATE eyefi_serial_numbers 
            SET 
                status = 'assigned',
                assigned_at = NOW(),
                assigned_by = (SELECT full_name FROM users WHERE id = NEW.created_by LIMIT 1),
                updated_at = NOW()
            WHERE serial_number = NEW.serialNumber;
        END IF;
    END IF;
END$$

DELIMITER ;

-- Step 4: Create Trigger - Handle Serial Number Changes on UPDATE
DELIMITER $$

DROP TRIGGER IF EXISTS mark_eyefi_used_ags_update$$

CREATE TRIGGER mark_eyefi_used_ags_update
AFTER UPDATE ON agsSerialGenerator
FOR EACH ROW
BEGIN
    -- Handle serial number change
    IF OLD.serialNumber != NEW.serialNumber OR 
       (OLD.serialNumber IS NULL AND NEW.serialNumber IS NOT NULL) OR 
       (OLD.serialNumber IS NOT NULL AND NEW.serialNumber IS NULL) THEN
        
        -- Release old serial (mark as available if not used elsewhere)
        IF OLD.serialNumber IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.serialNumber) THEN
                -- Check if old serial is used in other AGS records
                IF NOT EXISTS (
                    SELECT 1 FROM agsSerialGenerator 
                    WHERE serialNumber = OLD.serialNumber 
                    AND id != NEW.id
                ) THEN
                    -- Not used elsewhere in AGS, mark as available
                    UPDATE eyefi_serial_numbers 
                    SET status = 'available',
                        updated_at = NOW()
                    WHERE serial_number = OLD.serialNumber;
                END IF;
            END IF;
        END IF;
        
        -- Assign new serial
        IF NEW.serialNumber IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = NEW.serialNumber) THEN
                UPDATE eyefi_serial_numbers 
                SET 
                    status = 'assigned',
                    assigned_at = NOW(),
                    assigned_by = (SELECT full_name FROM users WHERE id = NEW.created_by LIMIT 1),
                    updated_at = NOW()
                WHERE serial_number = NEW.serialNumber;
            END IF;
        END IF;
    END IF;
END$$

DELIMITER ;

-- Step 5: Create Trigger - Mark Serial as "Available" on DELETE
DELIMITER $$

DROP TRIGGER IF EXISTS mark_eyefi_released_ags_delete$$

CREATE TRIGGER mark_eyefi_released_ags_delete
AFTER DELETE ON agsSerialGenerator
FOR EACH ROW
BEGIN
    IF OLD.serialNumber IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.serialNumber) THEN
            -- Check if serial is used in other AGS records
            IF NOT EXISTS (
                SELECT 1 FROM agsSerialGenerator 
                WHERE serialNumber = OLD.serialNumber
            ) THEN
                -- Not used elsewhere in AGS, mark as available
                UPDATE eyefi_serial_numbers 
                SET status = 'available',
                    updated_at = NOW()
                WHERE serial_number = OLD.serialNumber;
            END IF;
        END IF;
    END IF;
END$$

DELIMITER ;

-- Step 6: Backfill - Mark existing AGS serial numbers as assigned
UPDATE eyefi_serial_numbers esn
INNER JOIN agsSerialGenerator ags ON esn.serial_number = ags.serialNumber
SET esn.status = 'assigned',
    esn.assigned_at = COALESCE(esn.assigned_at, ags.timeStamp, NOW()),
    esn.updated_at = NOW()
WHERE esn.status != 'assigned'
  AND ags.serialNumber IS NOT NULL;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if foreign key was created
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'agsSerialGenerator' 
  AND CONSTRAINT_NAME = 'fk_ags_eyefi_serial';

-- Check if triggers were created
SELECT 
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE,
    ACTION_TIMING
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE EVENT_OBJECT_TABLE = 'agsSerialGenerator'
ORDER BY TRIGGER_NAME;

-- Check if index was created
SHOW INDEX FROM agsSerialGenerator WHERE Key_name = 'idx_ags_eyefi_serial';

-- =====================================================
-- Test Queries
-- =====================================================

-- Test 1: Find where a specific EyeFi serial is used
SELECT 
    'agsSerialGenerator' as source_table,
    id,
    serialNumber,
    sgPartNumber,
    property_site,
    timeStamp
FROM agsSerialGenerator
WHERE serialNumber = 'eyefi-007'; -- Replace with actual serial number

-- Test 2: Show all AGS records with their EyeFi serial status
SELECT 
    ags.id,
    ags.serialNumber,
    ags.sgPartNumber,
    ags.property_site,
    esn.status as eyefi_status,
    esn.product_model,
    esn.assigned_at,
    esn.assigned_by,
    ags.timeStamp
FROM agsSerialGenerator ags
LEFT JOIN eyefi_serial_numbers esn ON ags.serialNumber = esn.serial_number
WHERE ags.serialNumber IS NOT NULL
ORDER BY ags.timeStamp DESC
LIMIT 20;

-- Test 3: Count AGS records with EyeFi serials
SELECT 
    COUNT(*) as total_ags_with_eyefi,
    COUNT(DISTINCT serialNumber) as unique_eyefi_serials
FROM agsSerialGenerator
WHERE serialNumber IS NOT NULL;

-- Test 4: Check for orphaned assignments (marked assigned but not in AGS)
SELECT esn.serial_number, esn.status, esn.assigned_at
FROM eyefi_serial_numbers esn
WHERE esn.status = 'assigned'
  AND esn.serial_number NOT IN (
      SELECT serialNumber FROM agsSerialGenerator WHERE serialNumber IS NOT NULL
  );
