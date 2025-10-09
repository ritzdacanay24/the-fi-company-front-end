-- Add department_id column to users table
-- This allows users to be assigned to departments

-- Check if column exists first
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'department_id'
    AND TABLE_SCHEMA = DATABASE()
);

-- Add column if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE users ADD COLUMN department_id BIGINT NULL COMMENT "Department assignment for org chart" AFTER active',
    'SELECT "Column department_id already exists in users table" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for performance
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_NAME = 'users' 
    AND INDEX_NAME = 'idx_users_department'
    AND TABLE_SCHEMA = DATABASE()
);

SET @sql = IF(@index_exists = 0, 
    'ALTER TABLE users ADD INDEX idx_users_department (department_id)',
    'SELECT "Index idx_users_department already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint (optional - only if departments table exists)
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_NAME = 'users' 
    AND CONSTRAINT_NAME = 'fk_users_department'
    AND TABLE_SCHEMA = DATABASE()
);

SET @dept_table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLES 
    WHERE TABLE_NAME = 'departments'
    AND TABLE_SCHEMA = DATABASE()
);

SET @sql = IF(@fk_exists = 0 AND @dept_table_exists > 0, 
    'ALTER TABLE users ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL',
    'SELECT "Foreign key constraint not needed or already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;