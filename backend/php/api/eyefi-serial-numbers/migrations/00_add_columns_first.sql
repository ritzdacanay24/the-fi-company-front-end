-- =============================================
-- Add Assignment Tracking Columns - STANDALONE
-- =============================================
-- Run this FIRST before any trigger migrations
-- =============================================

-- Add columns for tracking assignments
ALTER TABLE eyefi_serial_numbers
ADD COLUMN IF NOT EXISTS assigned_to_table VARCHAR(100) NULL COMMENT 'Table name where serial is assigned (agsSerialGenerator, sgAssetGenerator, ul_label_usages)' AFTER status,
ADD COLUMN IF NOT EXISTS assigned_to_id BIGINT(20) NULL COMMENT 'Record ID in the assigned table' AFTER assigned_to_table,
ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(255) NULL COMMENT 'User who assigned the serial' AFTER assigned_to_id,
ADD COLUMN IF NOT EXISTS assigned_at DATETIME NULL COMMENT 'When the serial was assigned' AFTER assigned_by;

-- Add index for performance
ALTER TABLE eyefi_serial_numbers
ADD INDEX IF NOT EXISTS idx_eyefi_assigned_to (assigned_to_table, assigned_to_id);

-- Verify the columns were added
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE, 
  COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'eyefi_serial_numbers' 
  AND COLUMN_NAME IN ('assigned_to_table', 'assigned_to_id', 'assigned_by', 'assigned_at');
