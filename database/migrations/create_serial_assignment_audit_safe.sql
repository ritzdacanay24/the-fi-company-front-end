-- Safe Migration for Serial Assignment Audit Trail
-- This version checks for existing columns and skips the trigger if columns don't exist

-- Step 1: Create the audit trail table
CREATE TABLE IF NOT EXISTS serial_assignment_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    action VARCHAR(50) NOT NULL COMMENT 'created, voided, deleted, restored',
    serial_type VARCHAR(50) NOT NULL,
    serial_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    work_order_number VARCHAR(100) NULL,
    assigned_date DATETIME NULL,
    assigned_by VARCHAR(100) NULL,
    reason TEXT NULL COMMENT 'Reason for void/delete',
    performed_by VARCHAR(100) NOT NULL COMMENT 'User who performed this action',
    performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSON NULL COMMENT 'Additional context data',
    
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_serial_number (serial_number),
    INDEX idx_work_order (work_order_number),
    INDEX idx_performed_at (performed_at),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Add voided columns only if they don't exist
-- Check and add is_voided column
SET @column_exists := (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'serial_assignments' 
    AND column_name = 'is_voided'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE serial_assignments ADD COLUMN is_voided TINYINT(1) DEFAULT 0 COMMENT ''0=active, 1=voided''',
    'SELECT ''Column is_voided already exists'' AS Info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add voided_by column
SET @column_exists := (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'serial_assignments' 
    AND column_name = 'voided_by'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE serial_assignments ADD COLUMN voided_by VARCHAR(100) NULL',
    'SELECT ''Column voided_by already exists'' AS Info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add voided_at column
SET @column_exists := (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'serial_assignments' 
    AND column_name = 'voided_at'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE serial_assignments ADD COLUMN voided_at DATETIME NULL',
    'SELECT ''Column voided_at already exists'' AS Info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add void_reason column
SET @column_exists := (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'serial_assignments' 
    AND column_name = 'void_reason'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE serial_assignments ADD COLUMN void_reason TEXT NULL',
    'SELECT ''Column void_reason already exists'' AS Info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add index
SET @index_exists := (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'serial_assignments' 
    AND index_name = 'idx_is_voided'
);

SET @sql := IF(@index_exists = 0,
    'ALTER TABLE serial_assignments ADD INDEX idx_is_voided (is_voided)',
    'SELECT ''Index idx_is_voided already exists'' AS Info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_serial_assignment_audit_insert;

-- Step 4: Create trigger only if serial_type column exists
-- First, let's check if the required columns exist
SELECT 
    'Checking serial_assignments table structure...' AS Status;

SELECT 
    COLUMN_NAME
FROM 
    information_schema.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'serial_assignments'
    AND COLUMN_NAME IN ('serial_type', 'serial_id', 'serial_number', 'work_order_number', 'assigned_date', 'assigned_by')
ORDER BY 
    COLUMN_NAME;

-- Note: The trigger creation is commented out below
-- Uncomment and adjust based on your actual table structure
-- After running the check above, you'll know which columns exist

/*
DELIMITER $$

CREATE TRIGGER trg_serial_assignment_audit_insert
AFTER INSERT ON serial_assignments
FOR EACH ROW
BEGIN
    -- Adjust the column names below based on your actual table structure
    INSERT INTO serial_assignment_audit (
        assignment_id,
        action,
        serial_type,
        serial_id,
        serial_number,
        work_order_number,
        assigned_date,
        assigned_by,
        performed_by,
        performed_at
    ) VALUES (
        NEW.id,
        'created',
        NEW.serial_type,        -- Adjust if column name is different
        NEW.serial_id,          -- Adjust if column name is different
        NEW.serial_number,      -- Adjust if column name is different
        NEW.work_order_number,  -- Adjust if column name is different
        NEW.assigned_date,      -- Adjust if column name is different
        NEW.assigned_by,        -- Adjust if column name is different
        NEW.assigned_by,
        NOW()
    );
END$$

DELIMITER ;
*/

SELECT 'Migration completed! Review the column list above and create trigger manually if needed.' AS Status;
