-- Migration: Add expected_ul column to verification_sessions
-- Description: Add expected_ul field to store UL number reference for verification
-- Created: 2025-10-29

ALTER TABLE verification_sessions 
ADD COLUMN expected_ul VARCHAR(100) DEFAULT NULL COMMENT 'The expected UL number for reference' 
AFTER expected_serial;

-- Verify the change
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'verification_sessions'
  AND COLUMN_NAME = 'expected_ul';

SELECT 'Successfully added expected_ul column to verification_sessions!' AS status;
