-- Create system_settings table for storing application-wide settings
-- Compatible with MySQL 5.7+ and 8.0+

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `description` VARCHAR(255),
  `updated_by` VARCHAR(100),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default owner dropdown setting (enabled by default)
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`, `updated_by`) 
VALUES ('owner_dropdown_enabled', '1', 'Enable/disable owner dropdown across all forms', 'system')
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;

-- Display success message
SELECT 'system_settings table created successfully' AS message;
