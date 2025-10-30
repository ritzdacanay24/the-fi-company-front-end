-- Migration: Fix UNIQUE constraint on serial_assignments
-- Purpose: The unique constraint on (eyefi_serial_id, status) causes issues
--          We want to prevent duplicate ACTIVE assignments, but allow multiple consumed records
-- Date: 2025-10-30
-- Author: System

-- Drop the problematic UNIQUE constraint
ALTER TABLE eyefidb.serial_assignments
DROP INDEX unique_eyefi_serial_active;

-- Add a better constraint that only prevents duplicate non-voided assignments
-- This allows the same serial to be consumed multiple times (after voiding previous ones)
-- But prevents accidental double-assignments

-- Note: We'll handle uniqueness in application logic instead
-- The check in bulkCreateOtherAssignments already does this

SELECT 'Migration 006 completed - Removed unique_eyefi_serial_active constraint' as status;

-- Verify indexes
SHOW INDEX FROM eyefidb.serial_assignments WHERE Key_name LIKE '%serial%';
