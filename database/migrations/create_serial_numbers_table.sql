-- Serial Numbers Table Schema
-- Simple serial number generation and tracking system

-- Main serial numbers table
CREATE TABLE IF NOT EXISTS `generated_serial_numbers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `serial_number` VARCHAR(100) NOT NULL,
  `prefix` VARCHAR(10) DEFAULT NULL,
  `template_id` VARCHAR(50) DEFAULT NULL,
  `template_name` VARCHAR(100) DEFAULT NULL,
  `is_used` TINYINT(1) DEFAULT 0,
  `used_for` VARCHAR(50) DEFAULT NULL COMMENT 'product, asset, work_order, etc.',
  `reference_id` VARCHAR(100) DEFAULT NULL COMMENT 'ID of the record using this serial',
  `reference_table` VARCHAR(100) DEFAULT NULL COMMENT 'Table name where serial is used',
  `status` VARCHAR(20) DEFAULT 'available' COMMENT 'available, used, reserved',
  `notes` TEXT DEFAULT NULL,
  `generated_by` INT(11) DEFAULT NULL,
  `generated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_serial_number` (`serial_number`),
  KEY `idx_template` (`template_id`),
  KEY `idx_status` (`status`),
  KEY `idx_is_used` (`is_used`),
  KEY `idx_generated_by` (`generated_by`),
  KEY `idx_reference` (`reference_table`, `reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Generated serial numbers for asset tracking and inventory management';

-- Simple templates table for serial number patterns
CREATE TABLE IF NOT EXISTS `serial_number_templates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `template_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `prefix` VARCHAR(10) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_template_id` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Templates for serial number generation';

-- Insert default templates
INSERT INTO `serial_number_templates` (`template_id`, `name`, `description`, `prefix`, `is_active`, `is_default`) VALUES
('PROD_001', 'Product Serial', 'Product inventory serial numbers', 'PRD', 1, 1),
('ASSET_001', 'Asset Tracking', 'Asset management serial numbers', 'AST', 1, 0),
('WO_001', 'Work Order', 'Work order tracking numbers', 'WO', 1, 0),
('DEMO_001', 'Demo Equipment', 'Demo and testing equipment', 'DEMO', 1, 0),
('OTHER_001', 'Other', 'Custom serial numbers', '', 1, 0)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `prefix` = VALUES(`prefix`),
  `updated_at` = CURRENT_TIMESTAMP;

-- View for easy querying
CREATE OR REPLACE VIEW `v_generated_serial_numbers` AS
SELECT 
  gsn.id,
  gsn.serial_number,
  gsn.prefix,
  gsn.template_id,
  gsn.template_name,
  gsn.is_used,
  gsn.used_for,
  gsn.reference_id,
  gsn.reference_table,
  gsn.status,
  gsn.notes,
  gsn.generated_by,
  concat(u.first, ' ', u.last) as generated_by_name,
  gsn.generated_at,
  gsn.used_at,
  gsn.created_at,
  gsn.updated_at,
  CASE 
    WHEN gsn.is_used = 1 THEN 'Used'
    ELSE 'Available'
  END as status_label
FROM generated_serial_numbers gsn
LEFT JOIN db.users u ON gsn.generated_by = u.id;

-- View for templates
CREATE OR REPLACE VIEW `v_serial_number_templates` AS
SELECT 
  id,
  template_id,
  name,
  description,
  prefix,
  is_active,
  is_default,
  created_at,
  updated_at,
  (SELECT COUNT(*) FROM generated_serial_numbers WHERE template_id = serial_number_templates.template_id) as total_count,
  (SELECT COUNT(*) FROM generated_serial_numbers WHERE template_id = serial_number_templates.template_id AND is_used = 1) as used_count,
  (SELECT COUNT(*) FROM generated_serial_numbers WHERE template_id = serial_number_templates.template_id AND is_used = 0) as available_count
FROM serial_number_templates;
