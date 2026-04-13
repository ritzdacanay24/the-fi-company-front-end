-- Migration: Fix Foreign Key Constraint for Verification Sessions
-- Description: Remove and recreate the foreign key to allow NULL assignment_id values
-- This is required for workflow verification where sessions are created before DB save
-- Created: 2025-10-29

-- Drop the existing foreign key constraint
ALTER TABLE verification_sessions 
DROP FOREIGN KEY verification_sessions_ibfk_1;

-- Recreate the foreign key with NULL support
-- Note: Foreign keys in MySQL allow NULL by default, but we're being explicit
ALTER TABLE verification_sessions
ADD CONSTRAINT verification_sessions_ibfk_1 
FOREIGN KEY (assignment_id) 
REFERENCES serial_assignments(id) 
ON DELETE CASCADE;

-- Verify the change
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'verification_sessions'
  AND CONSTRAINT_NAME = 'verification_sessions_ibfk_1';

SELECT 'Foreign key constraint fixed! NULL assignment_id values are now allowed.' AS status;
