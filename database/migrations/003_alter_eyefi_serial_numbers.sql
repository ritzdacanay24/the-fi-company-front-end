-- Migration: Add consumption tracking to eyefi_serial_numbers
-- Purpose: Mark serials as consumed to prevent reuse
-- Date: 2025-10-17
-- Author: System

-- Add consumption tracking columns (safe method for all MySQL versions)

-- Add is_consumed column
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = 'eyefidb' AND table_name = 'eyefi_serial_numbers' AND column_name = 'is_consumed');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Column is_consumed already exists'' as message', 
    'ALTER TABLE eyefidb.eyefi_serial_numbers ADD COLUMN is_consumed BOOLEAN DEFAULT FALSE COMMENT ''True if serial has been assigned/consumed''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add consumed_at column
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = 'eyefidb' AND table_name = 'eyefi_serial_numbers' AND column_name = 'consumed_at');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Column consumed_at already exists'' as message', 
    'ALTER TABLE eyefidb.eyefi_serial_numbers ADD COLUMN consumed_at DATETIME NULL COMMENT ''Timestamp when serial was consumed''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add consumed_by column
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = 'eyefidb' AND table_name = 'eyefi_serial_numbers' AND column_name = 'consumed_by');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Column consumed_by already exists'' as message', 
    'ALTER TABLE eyefidb.eyefi_serial_numbers ADD COLUMN consumed_by VARCHAR(100) NULL COMMENT ''User who consumed the serial''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add assignment_id column
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = 'eyefidb' AND table_name = 'eyefi_serial_numbers' AND column_name = 'assignment_id');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Column assignment_id already exists'' as message', 
    'ALTER TABLE eyefidb.eyefi_serial_numbers ADD COLUMN assignment_id INT NULL COMMENT ''FK to serial_assignments.id''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for performance
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = 'eyefidb' AND table_name = 'eyefi_serial_numbers' AND index_name = 'idx_is_consumed');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Index idx_is_consumed already exists'' as message', 
    'ALTER TABLE eyefidb.eyefi_serial_numbers ADD INDEX idx_is_consumed (is_consumed)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = 'eyefidb' AND table_name = 'eyefi_serial_numbers' AND index_name = 'idx_consumed_at');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Index idx_consumed_at already exists'' as message', 
    'ALTER TABLE eyefidb.eyefi_serial_numbers ADD INDEX idx_consumed_at (consumed_at)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = 'eyefidb' AND table_name = 'eyefi_serial_numbers' AND index_name = 'idx_assignment_id');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Index idx_assignment_id already exists'' as message', 
    'ALTER TABLE eyefidb.eyefi_serial_numbers ADD INDEX idx_assignment_id (assignment_id)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional: Backfill existing data (mark old records as consumed)
-- Uncomment if you want to mark existing assigned serials as consumed
/*
UPDATE eyefidb.eyefi_serial_numbers 
SET is_consumed = TRUE,
    consumed_at = NOW(),
    consumed_by = 'MIGRATION_BACKFILL'
WHERE id IN (
    SELECT DISTINCT eyefi_serial_id 
    FROM eyefidb.sgAssetGenerator 
    WHERE active = 1
)
AND is_consumed = FALSE;

UPDATE eyefidb.eyefi_serial_numbers 
SET is_consumed = TRUE,
    consumed_at = NOW(),
    consumed_by = 'MIGRATION_BACKFILL'
WHERE id IN (
    SELECT DISTINCT eyefi_serial_id 
    FROM eyefidb.agsSerialGenerator 
    WHERE active = 1
)
AND is_consumed = FALSE;
*/

-- Verify (only if columns exist)
SELECT 
    COUNT(*) as total_serials,
    SUM(CASE WHEN IFNULL(is_consumed, FALSE) = TRUE THEN 1 ELSE 0 END) as consumed_count,
    SUM(CASE WHEN IFNULL(is_consumed, FALSE) = FALSE THEN 1 ELSE 0 END) as available_count
FROM eyefidb.eyefi_serial_numbers;
