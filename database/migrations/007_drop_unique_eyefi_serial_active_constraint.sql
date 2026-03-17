-- Migration 007: Drop UNIQUE constraint that blocks re-consumption of voided serials
-- Problem: UNIQUE KEY unique_eyefi_serial_active (eyefi_serial_id, status) fires when a serial
--          is voided and then consumed again, because both rows have status='consumed'.
-- Fix:     Drop the DB constraint. Duplicate-consumption prevention is already handled in
--          application logic (bulkCreateOtherAssignments checks for non-voided existing rows).
-- Date: 2026-03-11

-- Check if the constraint still exists before attempting to drop it
SET @exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name   = 'serial_assignments'
      AND index_name   = 'unique_eyefi_serial_active'
);

-- Drop only if present (avoids error if migration 006 was partially run)
SET @sql = IF(@exists > 0,
    'ALTER TABLE serial_assignments DROP INDEX unique_eyefi_serial_active',
    'SELECT ''unique_eyefi_serial_active index not found - already removed'' AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify result
SELECT
    index_name,
    column_name,
    non_unique
FROM information_schema.STATISTICS
WHERE table_schema = DATABASE()
  AND table_name   = 'serial_assignments'
ORDER BY index_name, seq_in_index;

SELECT 'Migration 007 complete - unique_eyefi_serial_active constraint removed' AS status;
