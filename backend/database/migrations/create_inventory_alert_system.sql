-- Create table for logging inventory alerts
CREATE TABLE IF NOT EXISTS inventory_alert_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_level ENUM('low', 'critical') NOT NULL,
    alert_data JSON NOT NULL,
    email_recipients JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_alert_level (alert_level)
);

-- Create table for alert configuration settings
CREATE TABLE IF NOT EXISTS inventory_alert_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
);

-- Insert default alert settings
INSERT INTO inventory_alert_settings (setting_key, setting_value) VALUES
('low_inventory_threshold', '10'),
('critical_inventory_threshold', '5'),
('alert_recipients_low', '["manager@company.com", "inventory@company.com", "operations@company.com"]'),
('alert_recipients_critical', '["manager@company.com", "inventory@company.com", "operations@company.com", "ceo@company.com"]'),
('email_enabled', 'true'),
('alert_frequency_hours', '24')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Create view for inventory status monitoring
CREATE OR REPLACE VIEW inventory_status_view AS
SELECT 
    category,
    COUNT(*) as total_count,
    SUM(CASE WHEN status = 'available' AND is_active = '1' THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN status = 'used' AND is_active = '1' THEN 1 ELSE 0 END) as used_count,
    SUM(CASE WHEN status = 'reserved' AND is_active = '1' THEN 1 ELSE 0 END) as reserved_count,
    SUM(CASE WHEN is_active = '0' THEN 1 ELSE 0 END) as soft_deleted_count,
    CASE 
        WHEN SUM(CASE WHEN status = 'available' AND is_active = '1' THEN 1 ELSE 0 END) <= 5 THEN 'critical'
        WHEN SUM(CASE WHEN status = 'available' AND is_active = '1' THEN 1 ELSE 0 END) <= 10 THEN 'low'
        ELSE 'normal'
    END as status_level,
    MAX(created_at) as last_updated
FROM igt_serial_numbers 
GROUP BY category;

-- Create stored procedure to check inventory and trigger alerts
DELIMITER //

CREATE PROCEDURE CheckInventoryLevels()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_category VARCHAR(50);
    DECLARE v_available INT;
    DECLARE v_status_level VARCHAR(20);
    
    DECLARE inventory_cursor CURSOR FOR 
        SELECT category, available_count, status_level 
        FROM inventory_status_view 
        WHERE status_level IN ('low', 'critical');
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table for alerts
    DROP TEMPORARY TABLE IF EXISTS temp_alerts;
    CREATE TEMPORARY TABLE temp_alerts (
        category VARCHAR(50),
        available_count INT,
        status_level VARCHAR(20),
        alert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    OPEN inventory_cursor;
    
    read_loop: LOOP
        FETCH inventory_cursor INTO v_category, v_available, v_status_level;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Insert alert data
        INSERT INTO temp_alerts (category, available_count, status_level)
        VALUES (v_category, v_available, v_status_level);
        
    END LOOP;
    
    CLOSE inventory_cursor;
    
    -- Return alerts that need to be sent
    SELECT * FROM temp_alerts;
    
END //

DELIMITER ;

-- Create event scheduler to automatically check inventory (runs every hour)
-- Uncomment the following if you want automatic checking
/*
CREATE EVENT IF NOT EXISTS auto_inventory_check
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
  CALL CheckInventoryLevels();
*/
