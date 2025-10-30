-- Migration: Modify Verification Sessions for Batch Capture
-- Description: Support capturing multiple serials per photo and multiple photos per session
-- Created: 2025-10-29

-- Modify verification_sessions for batch capture
ALTER TABLE verification_sessions
-- Change expected_serial to JSON array for batch
DROP COLUMN expected_serial,
ADD COLUMN expected_serials JSON NOT NULL COMMENT 'JSON array of all expected serial numbers to verify',
-- Change captured_serial to JSON array accumulating across photos
DROP COLUMN captured_serial,
ADD COLUMN captured_serials JSON DEFAULT NULL COMMENT 'JSON array of serials found across all photos',
-- Track multiple photos
DROP COLUMN photo_path,
ADD COLUMN photos JSON DEFAULT NULL COMMENT 'JSON array of photo submissions with extracted serials',
-- Add completion tracking
ADD COLUMN serials_found INT DEFAULT 0 COMMENT 'Count of serials successfully matched',
ADD COLUMN serials_expected INT DEFAULT 0 COMMENT 'Total count of expected serials',
-- Change match_result to reflect batch status
MODIFY COLUMN match_result ENUM('pending', 'partial', 'complete', 'mismatch') DEFAULT 'pending' COMMENT 'Batch verification status';

-- Add index for batch queries
ALTER TABLE verification_sessions
ADD INDEX idx_match_result (match_result);

-- Verify the changes
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'verification_sessions'
  AND COLUMN_NAME IN ('expected_serials', 'captured_serials', 'photos', 'serials_found', 'serials_expected', 'match_result');

SELECT 'Successfully modified verification_sessions for batch capture!' AS status;
