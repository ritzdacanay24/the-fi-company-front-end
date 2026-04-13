-- Migration: Add batch_id column to vw_all_consumed_serials view
-- Purpose: Update the view to include batch_id from serial_assignments
-- Date: 2025-12-22
-- Run this script to update the database view

USE eyefidb;

-- Drop and recreate the view with batch_id field
SOURCE c:/Users/rdacanay/Eyefi/modern/database/views/vw_all_consumed_serials.sql;

-- Verify the view has been updated
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'eyefidb' 
  AND TABLE_NAME = 'vw_all_consumed_serials'
  AND COLUMN_NAME = 'batch_id';

-- Test query to verify batch_id is included
SELECT batch_id, COUNT(*) as count
FROM vw_all_consumed_serials
GROUP BY batch_id
LIMIT 10;
