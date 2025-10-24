-- Migration: Add work order fields to serial_assignments table
-- Date: 2025-10-22
-- Purpose: Track work order information with each serial assignment

ALTER TABLE `serial_assignments`
ADD COLUMN `wo_number` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Work Order Number' AFTER `part_number`,
ADD COLUMN `wo_part` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Work Order Part Number' AFTER `wo_number`,
ADD COLUMN `wo_description` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Work Order Description' AFTER `wo_part`,
ADD COLUMN `wo_qty_ord` INT(11) NULL DEFAULT NULL COMMENT 'Work Order Ordered Quantity' AFTER `wo_description`,
ADD COLUMN `wo_due_date` DATE NULL DEFAULT NULL COMMENT 'Work Order Due Date' AFTER `wo_qty_ord`,
ADD COLUMN `wo_routing` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Work Order Routing' AFTER `wo_due_date`,
ADD COLUMN `wo_line` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Work Order Line' AFTER `wo_routing`,
ADD COLUMN `cp_cust_part` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Customer Part Number' AFTER `wo_line`,
ADD COLUMN `cp_cust` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Customer Name from WO' AFTER `cp_cust_part`,
ADD INDEX `idx_wo_number` (`wo_number`),
ADD INDEX `idx_wo_part` (`wo_part`),
ADD INDEX `idx_wo_due_date` (`wo_due_date`);

-- Update table comment
ALTER TABLE `serial_assignments` 
COMMENT='Central tracking table for all serial number assignments with work order tracking';
