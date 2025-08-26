-- UL Management System Database Migration
-- Created: 2024-08-20
-- Description: Creates tables for UL (Underwriters Laboratories) label management system

-- Create ul_labels table
CREATE TABLE IF NOT EXISTS `ul_labels` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ul_number` VARCHAR(50) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `manufacturer` VARCHAR(255) DEFAULT NULL,
    `part_number` VARCHAR(100) DEFAULT NULL,
    `certification_date` DATE DEFAULT NULL,
    `expiry_date` DATE DEFAULT NULL,
    `label_image_url` VARCHAR(500) DEFAULT NULL,
    `status` ENUM('active', 'inactive', 'expired') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT(11) DEFAULT NULL,
    `updated_by` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ul_number` (`ul_number`),
    INDEX `idx_ul_number` (`ul_number`),
    INDEX `idx_status` (`status`),
    INDEX `idx_category` (`category`),
    INDEX `idx_expiry_date` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ul_label_usages table
CREATE TABLE IF NOT EXISTS `ul_label_usages` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ul_label_id` INT(11) NOT NULL,
    `ul_number` VARCHAR(50) NOT NULL,
    `eyefi_serial_number` VARCHAR(100) NOT NULL,
    `quantity_used` INT(11) NOT NULL DEFAULT 1,
    `date_used` DATE NOT NULL,
    `user_signature` VARCHAR(255) NOT NULL,
    `user_name` VARCHAR(255) NOT NULL,
    `customer_name` VARCHAR(255) NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT(11) DEFAULT NULL,
    `updated_by` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ul_label_id`) REFERENCES `ul_labels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_ul_label_id` (`ul_label_id`),
    INDEX `idx_ul_number` (`ul_number`),
    INDEX `idx_date_used` (`date_used`),
    INDEX `idx_customer_name` (`customer_name`),
    INDEX `idx_eyefi_serial` (`eyefi_serial_number`),
    INDEX `idx_user_name` (`user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for UL Labels Report
CREATE OR REPLACE VIEW `vw_ul_labels_report` AS
SELECT 
    ul.id,
    ul.ul_number,
    ul.description,
    ul.category,
    ul.manufacturer,
    ul.part_number,
    ul.certification_date,
    ul.expiry_date,
    ul.status,
    ul.created_at,
    COALESCE(SUM(ulu.quantity_used), 0) as total_quantity_used,
    COUNT(ulu.id) as usage_count,
    MAX(ulu.date_used) as last_used_date,
    CASE 
        WHEN ul.expiry_date IS NOT NULL AND ul.expiry_date < CURDATE() THEN 'expired'
        WHEN ul.expiry_date IS NOT NULL AND ul.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
        ELSE ul.status
    END as computed_status
FROM ul_labels ul
LEFT JOIN ul_label_usages ulu ON ul.id = ulu.ul_label_id
GROUP BY ul.id, ul.ul_number, ul.description, ul.category, ul.manufacturer, 
         ul.part_number, ul.certification_date, ul.expiry_date, ul.status, ul.created_at;

-- Create view for UL Usage Report
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
    ulu.created_at,
    ul.status as ul_status
FROM ul_label_usages ulu
INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id;

-- Create view for UL Dashboard Statistics
CREATE OR REPLACE VIEW `vw_ul_dashboard_stats` AS
SELECT 
    (SELECT COUNT(*) FROM ul_labels WHERE status = 'active') as active_labels,
    (SELECT COUNT(*) FROM ul_labels WHERE status = 'inactive') as inactive_labels,
    (SELECT COUNT(*) FROM ul_labels WHERE status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < CURDATE())) as expired_labels,
    (SELECT COUNT(*) FROM ul_labels WHERE expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date >= CURDATE()) as expiring_soon_labels,
    (SELECT COUNT(*) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as usage_last_30_days,
    (SELECT COUNT(*) FROM ul_label_usages WHERE date_used = CURDATE()) as usage_today,
    (SELECT COUNT(DISTINCT customer_name) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as active_customers_30_days,
    (SELECT COALESCE(SUM(quantity_used), 0) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as total_quantity_used_30_days;

-- Insert sample data (optional)
INSERT INTO `ul_labels` (
    `ul_number`, `description`, `category`, `manufacturer`, `part_number`, 
    `certification_date`, `expiry_date`, `status`, `created_by`
) VALUES 
('E123456', 'Standard Electronics Component Label', 'Electronics', 'Sample Manufacturer A', 'PN-001', '2024-01-15', '2026-01-15', 'active', 1),
('E789012', 'High Voltage Component Label', 'Electronics', 'Sample Manufacturer B', 'PN-002', '2024-02-20', '2026-02-20', 'active', 1),
('E345678', 'Wire and Cable Assembly Label', 'Wiring', 'Sample Manufacturer C', 'PN-003', '2024-03-10', '2026-03-10', 'active', 1),
('E901234', 'Appliance Safety Label', 'Appliances', 'Sample Manufacturer D', 'PN-004', '2023-06-01', '2025-06-01', 'active', 1),
('E567890', 'Medical Device Component Label', 'Medical', 'Sample Manufacturer E', 'PN-005', '2024-01-01', '2025-12-31', 'active', 1);

-- Insert sample usage data (optional)
INSERT INTO `ul_label_usages` (
    `ul_label_id`, `ul_number`, `eyefi_serial_number`, `quantity_used`, 
    `date_used`, `user_signature`, `user_name`, `customer_name`, `notes`, `created_by`
) VALUES 
(1, 'E123456', 'SN-20240820-0001', 2, '2024-08-20', 'JOHN-001', 'John Doe', 'ABC Electronics Corp', 'Production batch #001', 1),
(1, 'E123456', 'SN-20240819-0002', 1, '2024-08-19', 'JANE-002', 'Jane Smith', 'XYZ Manufacturing', 'Quality test unit', 1),
(2, 'E789012', 'SN-20240818-0003', 3, '2024-08-18', 'BOB-003', 'Bob Johnson', 'DEF Industries', 'High voltage testing', 1),
(3, 'E345678', 'SN-20240817-0004', 1, '2024-08-17', 'ALICE-004', 'Alice Brown', 'GHI Automotive', 'Wiring harness assembly', 1),
(4, 'E901234', 'SN-20240816-0005', 2, '2024-08-16', 'MIKE-005', 'Mike Wilson', 'JKL Appliances', 'Safety compliance testing', 1);

-- Add indexes for performance optimization
CREATE INDEX `idx_ul_labels_created_at` ON `ul_labels` (`created_at`);
CREATE INDEX `idx_ul_label_usages_created_at` ON `ul_label_usages` (`created_at`);
CREATE INDEX `idx_ul_labels_manufacturer` ON `ul_labels` (`manufacturer`);
CREATE INDEX `idx_ul_labels_part_number` ON `ul_labels` (`part_number`);

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ul_labels TO 'your_app_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ul_label_usages TO 'your_app_user'@'localhost';
-- GRANT SELECT ON vw_ul_labels_report TO 'your_app_user'@'localhost';
-- GRANT SELECT ON vw_ul_usage_report TO 'your_app_user'@'localhost';
-- GRANT SELECT ON vw_ul_dashboard_stats TO 'your_app_user'@'localhost';

-- Final setup verification queries
SELECT 'UL Labels table created successfully' as message;
SELECT COUNT(*) as total_labels FROM ul_labels;
SELECT COUNT(*) as total_usages FROM ul_label_usages;
SELECT * FROM vw_ul_dashboard_stats;
