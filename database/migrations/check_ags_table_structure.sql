-- =====================================================
-- Check AGS Serial Table Structure
-- =====================================================

-- Show all columns in ags_serial table
DESCRIBE ags_serial;

-- Or use this alternative query
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ags_serial'
ORDER BY ORDINAL_POSITION;

-- Check if eyefi_serial_number column exists
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ags_serial' 
  AND (COLUMN_NAME LIKE '%serial%' OR COLUMN_NAME LIKE '%eyefi%');
