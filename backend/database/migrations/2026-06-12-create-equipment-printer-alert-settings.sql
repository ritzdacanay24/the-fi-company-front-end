CREATE TABLE equipment_printer_alert_settings (
  id INT PRIMARY KEY,
  warning_threshold_percent INT NOT NULL DEFAULT 25,
  critical_threshold_percent INT NOT NULL DEFAULT 10,
  cooldown_minutes INT NOT NULL DEFAULT 120,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_equipment_printer_alert_settings_warning
    CHECK (warning_threshold_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_equipment_printer_alert_settings_critical
    CHECK (critical_threshold_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_equipment_printer_alert_settings_cooldown
    CHECK (cooldown_minutes BETWEEN 5 AND 1440),
  CONSTRAINT chk_equipment_printer_alert_settings_relation
    CHECK (critical_threshold_percent <= warning_threshold_percent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO equipment_printer_alert_settings (
  id,
  warning_threshold_percent,
  critical_threshold_percent,
  cooldown_minutes,
  is_enabled
) VALUES (1, 25, 10, 120, true)
ON DUPLICATE KEY UPDATE
  warning_threshold_percent = VALUES(warning_threshold_percent),
  critical_threshold_percent = VALUES(critical_threshold_percent),
  cooldown_minutes = VALUES(cooldown_minutes),
  is_enabled = VALUES(is_enabled);
