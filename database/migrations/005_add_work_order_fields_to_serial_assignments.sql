-- Migration: Add Work Order Fields to serial_assignments
-- Purpose: Add detailed work order tracking fields to support Other customer assignments
-- Date: 2025-10-30
-- Author: System

-- Add work order related columns if they don't exist
ALTER TABLE eyefidb.serial_assignments
ADD COLUMN IF NOT EXISTS wo_number VARCHAR(50) DEFAULT NULL COMMENT 'Work order number',
ADD COLUMN IF NOT EXISTS wo_part VARCHAR(100) DEFAULT NULL COMMENT 'Work order part number',
ADD COLUMN IF NOT EXISTS wo_description TEXT DEFAULT NULL COMMENT 'Work order description',
ADD COLUMN IF NOT EXISTS wo_qty_ord INT DEFAULT NULL COMMENT 'Work order quantity ordered',
ADD COLUMN IF NOT EXISTS wo_due_date DATE DEFAULT NULL COMMENT 'Work order due date',
ADD COLUMN IF NOT EXISTS wo_routing VARCHAR(100) DEFAULT NULL COMMENT 'Work order routing',
ADD COLUMN IF NOT EXISTS wo_line INT DEFAULT NULL COMMENT 'Work order line number',
ADD COLUMN IF NOT EXISTS cp_cust_part VARCHAR(100) DEFAULT NULL COMMENT 'Customer part number',
ADD COLUMN IF NOT EXISTS cp_cust VARCHAR(100) DEFAULT NULL COMMENT 'Customer name (for Other type)';

-- Add indexes for commonly queried work order fields
ALTER TABLE eyefidb.serial_assignments
ADD INDEX IF NOT EXISTS idx_wo_number (wo_number),
ADD INDEX IF NOT EXISTS idx_cp_cust (cp_cust);

-- Verify the changes
SHOW COLUMNS FROM eyefidb.serial_assignments LIKE 'wo_%';
SHOW COLUMNS FROM eyefidb.serial_assignments LIKE 'cp_%';

SELECT 'Migration 005 completed successfully' as status;
