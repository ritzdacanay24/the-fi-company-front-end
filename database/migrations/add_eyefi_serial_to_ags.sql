-- =====================================================
-- Add EyeFi Serial Number Column to AGS Serial Table
-- =====================================================

-- Check if column exists first
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ags_serial' 
  AND COLUMN_NAME = 'eyefi_serial_number';

-- If it doesn't exist, add it
ALTER TABLE ags_serial 
ADD COLUMN eyefi_serial_number VARCHAR(100) NULL 
COMMENT 'EyeFi device serial number linked to this AGS asset'
AFTER serial_number;

-- Add index for performance
CREATE INDEX idx_ags_eyefi_serial ON ags_serial(eyefi_serial_number);

-- Verify it was added
DESCRIBE ags_serial;

-- Show the new column
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ags_serial' 
  AND COLUMN_NAME = 'eyefi_serial_number';
