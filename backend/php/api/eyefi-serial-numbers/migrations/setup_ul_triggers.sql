-- =====================================================
-- EyeFi Serial Number Tracking - Triggers for UL Labels
-- Table: ul_label_usages
-- Column: eyefi_serial_number
-- =====================================================

-- This migration sets up automatic tracking of EyeFi serial numbers
-- used in the UL Label Usages table via database triggers.

-- Step 1: Add Foreign Key Constraint (Optional but recommended)
-- This ensures data integrity - serial numbers must exist in eyefi_serial_numbers
ALTER TABLE ul_label_usages 
ADD CONSTRAINT fk_ul_eyefi_serial 
    FOREIGN KEY (eyefi_serial_number) 
    REFERENCES eyefi_serial_numbers(serial_number) 
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Note: Index idx_eyefi_serial already exists in the table

-- Step 2: Create Trigger - Mark Serial as "Assigned" on INSERT
DELIMITER $$

DROP TRIGGER IF EXISTS mark_eyefi_used_ul_insert$$

CREATE TRIGGER mark_eyefi_used_ul_insert
AFTER INSERT ON ul_label_usages
FOR EACH ROW
BEGIN
    IF NEW.eyefi_serial_number IS NOT NULL AND NEW.eyefi_serial_number != '' THEN
        -- Check if serial exists in eyefi_serial_numbers table
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = NEW.eyefi_serial_number) THEN
            -- Update status to 'assigned' with timestamp and user
            UPDATE eyefi_serial_numbers 
            SET 
                status = 'assigned',
                assigned_at = NOW(),
                assigned_by = CASE 
                    WHEN NEW.created_by IS NOT NULL AND NEW.created_by > 0 
                    THEN (SELECT CONCAT(first, ' ', last) FROM db.users WHERE id = NEW.created_by LIMIT 1)
                    ELSE NULL 
                END,
                updated_at = NOW()
            WHERE serial_number = NEW.eyefi_serial_number;
        END IF;
    END IF;
END$$

DELIMITER ;

-- Step 3: Create Trigger - Handle Serial Number Changes on UPDATE
DELIMITER $$

DROP TRIGGER IF EXISTS mark_eyefi_used_ul_update$$

CREATE TRIGGER mark_eyefi_used_ul_update
AFTER UPDATE ON ul_label_usages
FOR EACH ROW
BEGIN
    -- Handle serial number change
    IF OLD.eyefi_serial_number != NEW.eyefi_serial_number OR 
       (OLD.eyefi_serial_number IS NULL AND NEW.eyefi_serial_number IS NOT NULL) OR 
       (OLD.eyefi_serial_number IS NOT NULL AND NEW.eyefi_serial_number IS NULL) THEN
        
        -- Release old serial (mark as available if not used elsewhere)
        IF OLD.eyefi_serial_number IS NOT NULL AND OLD.eyefi_serial_number != '' THEN
            IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.eyefi_serial_number) THEN
                -- Check if old serial is used in other UL usage records
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
        IF NEW.eyefi_serial_number IS NOT NULL AND NEW.eyefi_serial_number != '' THEN
            IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = NEW.eyefi_serial_number) THEN
                UPDATE eyefi_serial_numbers 
                SET 
                    status = 'assigned',
                    assigned_at = NOW(),
                    assigned_by = CASE 
                        WHEN NEW.updated_by IS NOT NULL AND NEW.updated_by > 0 
                        THEN (SELECT CONCAT(first, ' ', last) FROM db.users WHERE id = NEW.updated_by LIMIT 1)
                        ELSE NULL 
                    END,
                    updated_at = NOW()
                WHERE serial_number = NEW.eyefi_serial_number;
            END IF;
        END IF;
    END IF;
END$$

DELIMITER ;

-- Step 4: Create Trigger - Mark Serial as "Available" on DELETE
DELIMITER $$

DROP TRIGGER IF EXISTS mark_eyefi_released_ul_delete$$

CREATE TRIGGER mark_eyefi_released_ul_delete
AFTER DELETE ON ul_label_usages
FOR EACH ROW
BEGIN
    IF OLD.eyefi_serial_number IS NOT NULL AND OLD.eyefi_serial_number != '' THEN
        IF EXISTS (SELECT 1 FROM eyefi_serial_numbers WHERE serial_number = OLD.eyefi_serial_number) THEN
            -- Check if serial is used in other UL usage records
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

-- -- Step 5: Backfill - Mark existing UL usage serial numbers as assigned
-- UPDATE eyefi_serial_numbers esn
-- INNER JOIN ul_label_usages ul ON esn.serial_number = ul.eyefi_serial_number
-- SET esn.status = 'assigned',
--     esn.assigned_at = COALESCE(esn.assigned_at, ul.created_at, NOW()),
--     esn.updated_at = NOW()
-- WHERE esn.status != 'assigned'
--   AND ul.eyefi_serial_number IS NOT NULL
--   AND ul.eyefi_serial_number != '';

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
  AND TRIGGER_NAME LIKE '%eyefi%'
ORDER BY TRIGGER_NAME;

-- =====================================================
-- Test Queries
-- =====================================================

-- Test 1: Find where a specific EyeFi serial is used in UL
SELECT 
    'ul_label_usages' as source_table,
    id,
    ul_number,
    eyefi_serial_number,
    customer_name,
    wo_nbr,
    date_used
FROM ul_label_usages
WHERE eyefi_serial_number = 'eyefi-007'; -- Replace with actual serial number

-- Test 2: Show all UL usage records with their EyeFi serial status
SELECT 
    ul.id,
    ul.ul_number,
    ul.eyefi_serial_number,
    ul.customer_name,
    ul.wo_nbr,
    esn.status as eyefi_status,
    esn.product_model,
    esn.assigned_at,
    esn.assigned_by,
    ul.date_used
FROM ul_label_usages ul
LEFT JOIN eyefi_serial_numbers esn ON ul.eyefi_serial_number = esn.serial_number
WHERE ul.eyefi_serial_number IS NOT NULL
  AND ul.eyefi_serial_number != ''
ORDER BY ul.date_used DESC
LIMIT 20;

-- Test 3: Count UL usage records with EyeFi serials
SELECT 
    COUNT(*) as total_ul_with_eyefi,
    COUNT(DISTINCT eyefi_serial_number) as unique_eyefi_serials
FROM ul_label_usages
WHERE eyefi_serial_number IS NOT NULL
  AND eyefi_serial_number != '';
