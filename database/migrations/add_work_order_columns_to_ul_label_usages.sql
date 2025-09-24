-- Add Work Order Columns to UL Label Usages Table
-- Created: 2025-09-24
-- Description: Adds work order tracking columns to ul_label_usages table

-- Add work order columns to ul_label_usages table
ALTER TABLE `ul_label_usages` 
ADD COLUMN `wo_nbr` INT(11) NULL COMMENT 'Work Order Number' AFTER `notes`,
ADD COLUMN `wo_due_date` DATE NULL COMMENT 'Work Order Due Date' AFTER `wo_nbr`,
ADD COLUMN `wo_part` VARCHAR(100) NULL COMMENT 'Work Order Part Number' AFTER `wo_due_date`,
ADD COLUMN `wo_qty_ord` INT(11) NULL COMMENT 'Work Order Quantity Ordered' AFTER `wo_part`,
ADD COLUMN `wo_routing` VARCHAR(50) NULL COMMENT 'Work Order Routing' AFTER `wo_qty_ord`,
ADD COLUMN `wo_line` VARCHAR(50) NULL COMMENT 'Work Order Line' AFTER `wo_routing`,
ADD COLUMN `wo_description` TEXT NULL COMMENT 'Work Order Description' AFTER `wo_line`;

-- Add indexes for work order queries
ALTER TABLE `ul_label_usages`
ADD INDEX `idx_wo_nbr` (`wo_nbr`),
ADD INDEX `idx_wo_part` (`wo_part`),
ADD INDEX `idx_wo_due_date` (`wo_due_date`);

-- Update the usage report view to include work order information
DROP VIEW IF EXISTS `vw_ul_usage_report`;

CREATE OR REPLACE VIEW `vw_ul_usage_report` AS
SELECT 
    ulu.id,
    ulu.ul_label_id,
    ulu.ul_number,
    ul.description as ul_description,
    ul.category,
    ul.manufacturer,
    ulu.eyefi_serial_number,
    ulu.quantity_used,
    ulu.date_used,
    ulu.user_signature,
    ulu.user_name,
    ulu.customer_name,
    ulu.notes,
    -- Work Order Information
    ulu.wo_nbr,
    ulu.wo_due_date,
    ulu.wo_part,
    ulu.wo_qty_ord,
    ulu.wo_routing,
    ulu.wo_line,
    ulu.wo_description,
    ulu.created_at,
    ul.status as ul_status
FROM ul_label_usages ulu
INNER JOIN ul_labels ul ON ul.id = ulu.ul_label_id
ORDER BY ulu.created_at DESC;

-- Create a work order summary view
CREATE OR REPLACE VIEW `vw_work_order_ul_usage_summary` AS
SELECT 
    ulu.wo_nbr,
    ulu.wo_part,
    ulu.wo_description,
    ulu.wo_due_date,
    COUNT(ulu.id) as ul_usage_count,
    SUM(ulu.quantity_used) as total_quantity_used,
    MIN(ulu.date_used) as first_usage_date,
    MAX(ulu.date_used) as last_usage_date,
    GROUP_CONCAT(DISTINCT ulu.ul_number ORDER BY ulu.ul_number SEPARATOR ', ') as ul_numbers_used
FROM ul_label_usages ulu
WHERE ulu.wo_nbr IS NOT NULL
GROUP BY ulu.wo_nbr, ulu.wo_part, ulu.wo_description, ulu.wo_due_date
ORDER BY ulu.wo_due_date DESC, ulu.wo_nbr DESC;

-- Add comments to document the changes
ALTER TABLE `ul_label_usages` 
COMMENT = 'UL Label usage tracking with work order information. Updated 2025-09-24 to include work order fields.';