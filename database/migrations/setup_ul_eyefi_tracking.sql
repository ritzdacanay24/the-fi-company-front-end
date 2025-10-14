-- =====================================================
-- EyeFi Serial Number Tracking - Option 2 Implementation
-- Foreign Key and Trigger Setup for UL Label Usages Table
-- =====================================================

-- Step 1: Check if eyefi_serial_number column exists in ul_label_usages
-- (If it doesn't exist, uncomment and run the following line)
-- ALTER TABLE ul_label_usages ADD COLUMN eyefi_serial_number VARCHAR(50) NULL AFTER serial_number;

-- Step 2: Add Foreign Key Constraint to UL Label Usages Table
ALTER TABLE ul_label_usages 
ADD CONSTRAINT fk_ul_eyefi_serial 
    FOREIGN KEY (eyefi_serial_number) 
    REFERENCES eyefi_serial_numbers(serial_number) 
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Add index for better performance
CREATE INDEX idx_ul_eyefi_serial ON ul_label_usages(eyefi_serial_number);

-- Step 3: Create Trigger to Mark EyeFi Serial as "Assigned" on INSERT
DELIMITER $$
CREATE TRIGGER mark_eyefi_used_ul_insert
AFTER INSERT ON ul_label_usages
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
CREATE TRIGGER mark_eyefi_used_ul_update
AFTER UPDATE ON ul_label_usages
FOR EACH ROW
BEGIN
    -- Handle serial number change
    IF OLD.eyefi_serial_number != NEW.eyefi_serial_number OR (OLD.eyefi_serial_number IS NULL AND NEW.eyefi_serial_number IS NOT NULL) OR (OLD.eyefi_serial_number IS NOT NULL AND NEW.eyefi_serial_number IS NULL) THEN
        
        -- Release old serial (mark as available if not used elsewhere)
        IF OLD.eyefi_serial_number IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.eyefi_serial_number) THEN
                -- Check if old serial is used in other UL records
                IF NOT EXISTS (
                    SELECT 1 FROM ul_label_usages 
                    WHERE eyefi_serial_number = OLD.eyefi_serial_number 
                    AND id != NEW.id
                ) THEN
                    -- Not used elsewhere in UL usages, mark as available
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

-- Step 5: Create Trigger to Handle UL Usage Record Deletion
DELIMITER $$
CREATE TRIGGER mark_eyefi_released_ul_delete
AFTER DELETE ON ul_label_usages
FOR EACH ROW
BEGIN
    IF OLD.eyefi_serial_number IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.eyefi_serial_number) THEN
            -- Check if serial is used in other UL records
            IF NOT EXISTS (
                SELECT 1 FROM ul_label_usages 
                WHERE eyefi_serial_number = OLD.eyefi_serial_number
            ) THEN
                -- Not used elsewhere in UL usages, mark as available
                UPDATE eyefi_serial_numbers 
                SET status = 'available',
                    updated_at = NOW()
                WHERE serial_number = OLD.eyefi_serial_number;
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;

-- Step 6: Update existing UL usage records to mark their EyeFi serials as assigned
-- (Run this ONLY if you have existing UL usage records with EyeFi serial numbers)
UPDATE eyefi_serial_numbers esn
INNER JOIN ul_label_usages ul ON esn.serial_number = ul.eyefi_serial_number
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
WHERE TABLE_NAME = 'ul_label_usages' 
  AND CONSTRAINT_NAME = 'fk_ul_eyefi_serial';

-- Check if triggers were created
SELECT 
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE,
    ACTION_TIMING
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE EVENT_OBJECT_TABLE = 'ul_label_usages'
ORDER BY TRIGGER_NAME;

-- Test query: Find where a specific EyeFi serial is used
SELECT 
    'ul_label_usages' as source_table,
    ul.id,
    ul.ul_number,
    ul.eyefi_serial_number,
    ul.work_order,
    ul.quantity_used,
    ul.date_used
FROM ul_label_usages ul
WHERE ul.eyefi_serial_number = 'eyefi-007'; -- Replace with actual serial number

-- Test query: Show all UL usage records with their EyeFi serial status
SELECT 
    ul.id,
    ul.ul_number,
    ul.eyefi_serial_number,
    esn.status as eyefi_status,
    esn.product_model,
    esn.last_assigned_at,
    ul.date_used
FROM ul_label_usages ul
LEFT JOIN eyefi_serial_numbers esn ON ul.eyefi_serial_number = esn.serial_number
WHERE ul.eyefi_serial_number IS NOT NULL
ORDER BY ul.date_used DESC
LIMIT 20;
