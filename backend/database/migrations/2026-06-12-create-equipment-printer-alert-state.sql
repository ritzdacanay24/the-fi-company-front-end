CREATE TABLE equipment_printer_alert_state (
  id INT PRIMARY KEY AUTO_INCREMENT,
  printer_id INT NOT NULL,
  alert_key VARCHAR(255) NOT NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity ENUM('warning', 'critical') NOT NULL,
  message VARCHAR(500) NOT NULL,
  last_value VARCHAR(255),
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_notified_at TIMESTAMP NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_equipment_printer_alert (printer_id, alert_key),
  KEY idx_equipment_printer_alert_active (is_active),
  CONSTRAINT fk_equipment_printer_alert_printer
    FOREIGN KEY (printer_id) REFERENCES equipment_printers(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
