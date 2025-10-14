-- =====================================================
-- EyeFi Serial Number Tracking - Option 2 Implementation
-- Foreign Key and Trigger Setup for IGT Assets Table
-- =====================================================

-- Step 1: Add eyefi_serial_number column to igt_assets table (if it doesn't exist)
-- ALTER TABLE igt_assets ADD COLUMN eyefi_serial_number VARCHAR(50) NULL AFTER serial_number;

-- Step 2: Add Foreign Key Constraint to IGT Assets Table
ALTER TABLE igt_assets 
ADD CONSTRAINT fk_igt_eyefi_serial 
    FOREIGN KEY (eyefi_serial_number) 
    REFERENCES eyefi_serial_numbers(serial_number) 
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Add index for better performance
CREATE INDEX idx_igt_eyefi_serial ON igt_assets(eyefi_serial_number);

-- Step 3: Create Trigger to Mark EyeFi Serial as "Assigned" on INSERT
DELIMITER $$
CREATE TRIGGER mark_eyefi_used_igt_insert
AFTER INSERT ON igt_assets
FOR EACH ROW
BEGIN
    IF NEW.eyefi_serial_number IS NOT NULL THEN
        -- Check if serial exists in eyefi_serial_numbers table
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = NEW.eyefi_serial_number) THEN
            -- Update status to 'assigned'
            UPDATE eyefi_serial_numbers 
            SET 
                status = 'assigned',
                last_assigned_at = NOW(),
                updated_at = NOW()
            WHERE serial_number = NEW.eyefi_serial_number;
        END IF;
    END IF;
END$$
DELIMITER ;

-- Step 4: Create Trigger to Handle Serial Number Updates
DELIMITER $$
CREATE TRIGGER mark_eyefi_used_igt_update
AFTER UPDATE ON igt_assets
FOR EACH ROW
BEGIN
    -- Handle serial number change
    IF OLD.eyefi_serial_number != NEW.eyefi_serial_number OR (OLD.eyefi_serial_number IS NULL AND NEW.eyefi_serial_number IS NOT NULL) OR (OLD.eyefi_serial_number IS NOT NULL AND NEW.eyefi_serial_number IS NULL) THEN
        
        -- Release old serial (mark as available if not used elsewhere)
        IF OLD.eyefi_serial_number IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.eyefi_serial_number) THEN
                -- Check if old serial is used in other IGT assets
                IF NOT EXISTS (
                    SELECT 1 FROM igt_assets 
                    WHERE eyefi_serial_number = OLD.eyefi_serial_number 
                    AND id != NEW.id
                ) THEN
                    -- Not used elsewhere in IGT assets, mark as available
                    UPDATE eyefi_serial_numbers 
                    SET status = 'available',
                        updated_at = NOW()
                    WHERE serial_number = OLD.eyefi_serial_number;
                END IF;
            END IF;
        END IF;
        
        -- Assign new serial
        IF NEW.eyefi_serial_number IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = NEW.eyefi_serial_number) THEN
                UPDATE eyefi_serial_numbers 
                SET 
                    status = 'assigned',
                    last_assigned_at = NOW(),
                    updated_at = NOW()
                WHERE serial_number = NEW.eyefi_serial_number;
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;

-- Step 5: Create Trigger to Handle IGT Asset Deletion
DELIMITER $$
CREATE TRIGGER mark_eyefi_released_igt_delete
AFTER DELETE ON igt_assets
FOR EACH ROW
BEGIN
    IF OLD.eyefi_serial_number IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.eyefi_serial_number) THEN
            -- Check if serial is used in other IGT assets
            IF NOT EXISTS (
                SELECT 1 FROM igt_assets 
                WHERE eyefi_serial_number = OLD.eyefi_serial_number
            ) THEN
                -- Not used elsewhere in IGT assets, mark as available
                UPDATE eyefi_serial_numbers 
                SET status = 'available',
                    updated_at = NOW()
                WHERE serial_number = OLD.eyefi_serial_number;
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;

-- Step 6: Update existing IGT assets to mark their EyeFi serials as assigned
-- (Run this ONLY if you have existing IGT assets with EyeFi serial numbers)
UPDATE eyefi_serial_numbers esn
INNER JOIN igt_assets igt ON esn.serial_number = igt.eyefi_serial_number
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
WHERE TABLE_NAME = 'igt_assets' 
  AND CONSTRAINT_NAME = 'fk_igt_eyefi_serial';

-- Check if triggers were created
SELECT 
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE,
    ACTION_TIMING
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE EVENT_OBJECT_TABLE = 'igt_assets'
ORDER BY TRIGGER_NAME;

-- Test query: Find where a specific EyeFi serial is used
SELECT 
    'igt_assets' as source_table,
    igt.id,
    igt.asset_tag,
    igt.eyefi_serial_number,
    igt.product_model,
    igt.location,
    igt.created_at
FROM igt_assets igt
WHERE igt.eyefi_serial_number = 'eyefi-007'; -- Replace with actual serial number

-- Test query: Show all IGT assets with their EyeFi serial status
SELECT 
    igt.id,
    igt.asset_tag,
    igt.eyefi_serial_number,
    esn.status as eyefi_status,
    esn.product_model as eyefi_model,
    esn.last_assigned_at,
    igt.location,
    igt.created_at
FROM igt_assets igt
LEFT JOIN eyefi_serial_numbers esn ON igt.eyefi_serial_number = esn.serial_number
WHERE igt.eyefi_serial_number IS NOT NULL
ORDER BY igt.created_at DESC
LIMIT 20;
