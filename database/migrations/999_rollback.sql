-- Rollback script for database migrations
-- Run this if you need to undo the changes
-- Date: 2025-10-17
-- Author: System

-- WARNING: This will remove all tracking data!
-- Make sure to backup your data before running this.

-- Rollback Step 4: Remove columns from ul_labels
ALTER TABLE eyefidb.ul_labels 
DROP COLUMN IF EXISTS is_consumed,
DROP COLUMN IF EXISTS consumed_at,
DROP COLUMN IF EXISTS consumed_by,
DROP COLUMN IF EXISTS assignment_id;

-- Rollback Step 3: Remove columns from eyefi_serial_numbers
ALTER TABLE eyefidb.eyefi_serial_numbers 
DROP COLUMN IF EXISTS is_consumed,
DROP COLUMN IF EXISTS consumed_at,
DROP COLUMN IF EXISTS consumed_by,
DROP COLUMN IF EXISTS assignment_id;

-- Rollback Step 2: Drop serial_assignments table
DROP TABLE IF EXISTS eyefidb.serial_assignments;

-- Rollback Step 1: Drop customer_types table
DROP TABLE IF EXISTS eyefidb.customer_types;

-- Verify rollback
SHOW TABLES LIKE '%customer_types%';
SHOW TABLES LIKE '%serial_assignments%';
