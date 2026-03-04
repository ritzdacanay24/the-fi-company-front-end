-- Daily Reports Table Migration
-- Run this SQL to create the daily_reports table

CREATE TABLE IF NOT EXISTS `daily_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Live Report',
  `data` JSON NOT NULL COMMENT 'Stores JSON report data',
  `created_by` INT NULL COMMENT 'User ID who created this report',
  `updated_date` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` INT NULL COMMENT 'User ID who last updated',
  INDEX idx_created_date (created_date),
  INDEX idx_status (status),
  FULLTEXT INDEX ft_data (data)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Create a view for easier querying
CREATE OR REPLACE VIEW daily_reports_summary AS
SELECT 
  id,
  created_date,
  status,
  JSON_EXTRACT(data, '$.total_open') AS total_open,
  JSON_EXTRACT(data, '$.inventory_value') AS inventory_value,
  JSON_EXTRACT(data, '$.on_time_delivery_today_percent') AS on_time_percent,
  JSON_EXTRACT(data, '$.last_refreshed') AS last_refreshed
FROM daily_reports
ORDER BY created_date DESC;

-- Import sample data (optional)
-- INSERT INTO daily_reports (created_date, status, data) VALUES 
-- (NOW(), 'Live Report', '{your JSON data here}');
