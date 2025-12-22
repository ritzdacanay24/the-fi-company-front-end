-- Migration: Add batch_id column to serial_assignments table
-- Purpose: Track which serial assignments were created together in a batch operation
-- Date: 2025-12-22
-- Author: System

-- Step 1: Add batch_id column
ALTER TABLE serial_assignments 
ADD COLUMN batch_id VARCHAR(50) NULL COMMENT 'Groups assignments created together in a batch operation' AFTER inspector_name;

-- Step 2: Add index for batch_id
ALTER TABLE serial_assignments 
ADD INDEX idx_batch_id (batch_id);

-- Step 3: Backfill batch_id for existing records
-- Groups records by created_at timestamp, wo_number, and consumed_by
-- Assigns same batch_id to records created within the same second
UPDATE serial_assignments sa
JOIN (
    SELECT 
        id,
        CONCAT(
            'BATCH-',
            DATE_FORMAT(created_at, '%Y%m%d%H%i%s'),
            '-',
            SUBSTRING(MD5(CONCAT(created_at, IFNULL(wo_number, ''), IFNULL(consumed_by, ''))), 1, 8)
        ) as new_batch_id
    FROM serial_assignments
    WHERE batch_id IS NULL
      AND created_at IS NOT NULL
) as batches ON sa.id = batches.id
SET sa.batch_id = batches.new_batch_id
WHERE sa.batch_id IS NULL;

-- Step 4: Verify the migration
SELECT 
    batch_id,
    COUNT(*) as count,
    MIN(created_at) as created_at,
    wo_number,
    consumed_by
FROM serial_assignments
WHERE batch_id IS NOT NULL
GROUP BY batch_id, wo_number, consumed_by
ORDER BY created_at DESC
LIMIT 20;

-- Summary
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT batch_id) as total_batches,
    SUM(CASE WHEN batch_id IS NOT NULL THEN 1 ELSE 0 END) as records_with_batch_id,
    SUM(CASE WHEN batch_id IS NULL THEN 1 ELSE 0 END) as records_without_batch_id
FROM serial_assignments;
