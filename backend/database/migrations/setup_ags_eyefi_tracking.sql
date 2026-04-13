-- =====================================================
-- EyeFi Serial Number Tracking - Option 2 Implementation
-- Foreign Key and Trigger Setup for AGS Serial Table
-- =====================================================

-- Step 1: Add Foreign Key Constraint to AGS Table
-- This links the existing serialNumber column to eyefi_serial_numbers table
ALTER TABLE ags_serial 
ADD CONSTRAINT fk_ags_eyefi_serial 
    FOREIGN KEY (serialNumber) 
    REFERENCES eyefi_serial_numbers(serial_number) 
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Add index for better performance
CREATE INDEX idx_ags_eyefi_serial ON ags_serial(serialNumber);

-- Step 2: Create Trigger to Mark EyeFi Serial as "Assigned" on INSERT
DELIMITER $$
CREATE TRIGGER mark_eyefi_used_ags_insert
AFTER INSERT ON ags_serial
FOR EACH ROW
BEGIN
    IF NEW.serialNumber IS NOT NULL THEN
        -- Check if serial exists in eyefi_serial_numbers table
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = NEW.serialNumber) THEN
            -- Update status to 'assigned'
            UPDATE eyefi_serial_numbers 
            SET 
                status = 'assigned',
                last_assigned_at = NOW(),
                updated_at = NOW()
            WHERE serial_number = NEW.serialNumber;
        END IF;
    END IF;
END$$
DELIMITER ;

-- Step 3: Create Trigger to Handle Serial Number Updates
DELIMITER $$
CREATE TRIGGER mark_eyefi_used_ags_update
AFTER UPDATE ON ags_serial
FOR EACH ROW
BEGIN
    -- Handle serial number change
    IF OLD.serialNumber != NEW.serialNumber OR (OLD.serialNumber IS NULL AND NEW.serialNumber IS NOT NULL) OR (OLD.serialNumber IS NOT NULL AND NEW.serialNumber IS NULL) THEN
        
        -- Release old serial (mark as available if not used elsewhere)
        IF OLD.serialNumber IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.serialNumber) THEN
                -- Check if old serial is used in other AGS records
                IF NOT EXISTS (
                    SELECT 1 FROM ags_serial 
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
                    last_assigned_at = NOW(),
                    updated_at = NOW()
                WHERE serial_number = NEW.serialNumber;
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;

-- Step 4: Create Trigger to Handle AGS Record Deletion
DELIMITER $$
CREATE TRIGGER mark_eyefi_released_ags_delete
AFTER DELETE ON ags_serial
FOR EACH ROW
BEGIN
    IF OLD.serialNumber IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.serialNumber) THEN
            -- Check if serial is used in other AGS records
            IF NOT EXISTS (
                SELECT 1 FROM ags_serial 
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

-- Step 5: Update existing AGS records to mark their EyeFi serials as assigned
-- (Run this ONLY if you have existing AGS records with EyeFi serial numbers)
UPDATE eyefi_serial_numbers esn
INNER JOIN ags_serial ags ON esn.serial_number = ags.serialNumber
SET esn.status = 'assigned',
    esn.last_assigned_at = NOW(),
    esn.updated_at = NOW()
WHERE esn.status != 'assigned';

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
WHERE TABLE_NAME = 'ags_serial' 
  AND CONSTRAINT_NAME = 'fk_ags_eyefi_serial';

-- Check if triggers were created
SELECT 
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE,
    ACTION_TIMING
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE EVENT_OBJECT_TABLE = 'ags_serial'
ORDER BY TRIGGER_NAME;

-- Test query: Find where a specific EyeFi serial is used
SELECT 
    'ags_serial' as source_table,
    ags.id,
    ags.generated_SG_asset,
    ags.serialNumber as eyefi_serial,
    ags.poNumber as work_order,
    ags.created_at
FROM ags_serial ags
WHERE ags.serialNumber = 'eyefi-007'; -- Replace with actual serial number

-- Test query: Show all AGS records with their EyeFi serial status
SELECT 
    ags.id,
    ags.generated_SG_asset,
    ags.serialNumber,
    esn.status as eyefi_status,
    esn.product_model,
    esn.last_assigned_at
FROM ags_serial ags
LEFT JOIN eyefi_serial_numbers esn ON ags.serialNumber = esn.serial_number
WHERE ags.serialNumber IS NOT NULL
ORDER BY ags.created_at DESC
LIMIT 20;

-- Test query: Count EyeFi serials by status
SELECT 
    status,
    COUNT(*) as count
FROM eyefi_serial_numbers
GROUP BY status
ORDER BY status;
