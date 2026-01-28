-- Backup Script: Before adding batch_id to serial_assignments
-- Purpose: Create backup table before modifying serial_assignments
-- Date: 2025-12-22
-- Run this BEFORE running add_batch_id_to_serial_assignments.sql

-- Step 1: Create backup table with timestamp
DROP TABLE IF EXISTS serial_assignments_backup_20251222;

CREATE TABLE serial_assignments_backup_20251222 LIKE serial_assignments;

INSERT INTO serial_assignments_backup_20251222 
SELECT * FROM serial_assignments;

-- Step 2: Verify backup
SELECT 
    'serial_assignments' as table_name,
    COUNT(*) as record_count
FROM serial_assignments
UNION ALL
SELECT 
    'serial_assignments_backup_20251222' as table_name,
    COUNT(*) as record_count
FROM serial_assignments_backup_20251222;

-- Step 3: Show backup table info
SELECT 
    'Backup created successfully' as status,
    COUNT(*) as backed_up_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM serial_assignments_backup_20251222;

-- Note: If you need to restore from backup, run:
-- TRUNCATE TABLE serial_assignments;
-- INSERT INTO serial_assignments SELECT * FROM serial_assignments_backup_20251222;
