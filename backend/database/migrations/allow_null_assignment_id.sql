-- Migration: Allow NULL assignment_id in verification tables
-- Description: Modify verification_sessions and verification_audit_log to allow NULL assignment_id
-- This is required for workflow verification where sessions are created before DB save
-- Created: 2025-10-29

-- Modify verification_sessions table to allow NULL assignment_id
ALTER TABLE verification_sessions 
MODIFY COLUMN assignment_id INT DEFAULT NULL COMMENT 'Foreign key to serial_assignments (NULL for workflow verification before DB save)';

-- Modify verification_audit_log table to allow NULL assignment_id
ALTER TABLE verification_audit_log 
MODIFY COLUMN assignment_id INT DEFAULT NULL COMMENT 'Can be NULL for workflow verification';

-- Verify the changes
SELECT 
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_TYPE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('verification_sessions', 'verification_audit_log')
  AND COLUMN_NAME = 'assignment_id';

SELECT 'Successfully modified verification tables to allow NULL assignment_id!' AS status;
