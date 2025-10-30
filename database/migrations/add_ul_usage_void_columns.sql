-- Add void-related columns to ul_label_usages table
-- Created: 2025-10-27
-- Description: Adds is_voided, void_reason, void_date, and work order columns to support void and WO functionality

-- Check and add work order columns to ul_label_usages table
SET @dbname = DATABASE();
SET @tablename = 'ul_label_usages';

-- Add wo_nbr if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'wo_nbr';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `wo_nbr` INT(11) DEFAULT NULL AFTER `customer_name`', 
    'SELECT "Column wo_nbr already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add wo_due_date if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'wo_due_date';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `wo_due_date` DATE DEFAULT NULL AFTER `wo_nbr`', 
    'SELECT "Column wo_due_date already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add wo_part if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'wo_part';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `wo_part` VARCHAR(100) DEFAULT NULL AFTER `wo_due_date`', 
    'SELECT "Column wo_part already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add wo_qty_ord if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'wo_qty_ord';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `wo_qty_ord` INT(11) DEFAULT NULL AFTER `wo_part`', 
    'SELECT "Column wo_qty_ord already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add wo_routing if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'wo_routing';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `wo_routing` VARCHAR(50) DEFAULT NULL AFTER `wo_qty_ord`', 
    'SELECT "Column wo_routing already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add wo_line if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'wo_line';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `wo_line` VARCHAR(50) DEFAULT NULL AFTER `wo_routing`', 
    'SELECT "Column wo_line already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add wo_description if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'wo_description';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `wo_description` TEXT DEFAULT NULL AFTER `wo_line`', 
    'SELECT "Column wo_description already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_voided if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'is_voided';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `is_voided` TINYINT(1) NOT NULL DEFAULT 0 AFTER `updated_by`', 
    'SELECT "Column is_voided already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add void_reason if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'void_reason';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `void_reason` TEXT DEFAULT NULL AFTER `is_voided`', 
    'SELECT "Column void_reason already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add void_date if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'void_date';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_label_usages` ADD COLUMN `void_date` TIMESTAMP NULL DEFAULT NULL AFTER `void_reason`', 
    'SELECT "Column void_date already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for better query performance
-- Check and create idx_is_voided
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ul_label_usages' AND INDEX_NAME = 'idx_is_voided';
SET @query = IF(@index_exists = 0, 
    'CREATE INDEX `idx_is_voided` ON `ul_label_usages` (`is_voided`)', 
    'SELECT "Index idx_is_voided already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and create idx_wo_nbr
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ul_label_usages' AND INDEX_NAME = 'idx_wo_nbr';
SET @query = IF(@index_exists = 0, 
    'CREATE INDEX `idx_wo_nbr` ON `ul_label_usages` (`wo_nbr`)', 
    'SELECT "Index idx_wo_nbr already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and create idx_wo_part
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ul_label_usages' AND INDEX_NAME = 'idx_wo_part';
SET @query = IF(@index_exists = 0, 
    'CREATE INDEX `idx_wo_part` ON `ul_label_usages` (`wo_part`)', 
    'SELECT "Index idx_wo_part already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_consumed column to ul_labels
SET @tablename = 'ul_labels';
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'is_consumed';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `ul_labels` ADD COLUMN `is_consumed` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`', 
    'SELECT "Column is_consumed already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and create index for is_consumed
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ul_labels' AND INDEX_NAME = 'idx_is_consumed';
SET @query = IF(@index_exists = 0, 
    'CREATE INDEX `idx_is_consumed` ON `ul_labels` (`is_consumed`)', 
    'SELECT "Index idx_is_consumed already exists" as note');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update view for UL Usage Report to include void and work order information
DROP VIEW IF EXISTS `vw_ul_usage_report`;
CREATE VIEW `vw_ul_usage_report` AS
SELECT 
    ulu.id,
    ulu.ul_label_id,
    ulu.ul_number,
    ul.description as ul_description,
    ul.category,
    ul.manufacturer,
    ulu.eyefi_serial_number,
    ulu.quantity_used,
    ulu.date_used,
    ulu.user_signature,
    ulu.user_name,
    ulu.customer_name,
    ulu.wo_nbr,
    ulu.wo_due_date,
    ulu.wo_part,
    ulu.wo_qty_ord,
    ulu.wo_routing,
    ulu.wo_line,
    ulu.wo_description,
    ulu.notes,
    ulu.created_at,
    ulu.is_voided,
    ulu.void_reason,
    ulu.void_date,
    ul.status as ul_status,
    CASE 
        WHEN ulu.is_voided = 1 THEN 'voided'
        ELSE 'active'
    END as usage_status
FROM ul_label_usages ulu
INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id;

-- Verification query
SELECT 'UL usage void and work order columns added successfully' as message;
SELECT 
    COUNT(*) as total_usages,
    SUM(CASE WHEN is_voided = 1 THEN 1 ELSE 0 END) as voided_usages,
    SUM(CASE WHEN is_voided = 0 THEN 1 ELSE 0 END) as active_usages,
    SUM(CASE WHEN wo_nbr IS NOT NULL THEN 1 ELSE 0 END) as usages_with_wo
FROM ul_label_usages;
