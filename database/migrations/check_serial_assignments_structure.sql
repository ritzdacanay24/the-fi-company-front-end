-- Check the structure of serial_assignments table
DESCRIBE serial_assignments;

-- Or use this to see all columns
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    COLUMN_DEFAULT,
    EXTRA
FROM 
    information_schema.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'serial_assignments'
ORDER BY 
    ORDINAL_POSITION;
