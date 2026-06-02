-- Add child serial numbers table for shipping checklist line items
-- Supports one-to-many serials per part line

CREATE TABLE IF NOT EXISTS eyefidb.shipping_checklist_instance_line_serials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  line_id INT NOT NULL,
  serial_order INT NOT NULL,
  serial_number VARCHAR(200) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_shipping_checklist_line_serials_line_id (line_id),
  KEY idx_shipping_checklist_line_serials_serial (serial_number),
  UNIQUE KEY uq_shipping_checklist_line_serials_order (line_id, serial_order),
  CONSTRAINT fk_shipping_checklist_line_serials_line
    FOREIGN KEY (line_id)
    REFERENCES eyefidb.shipping_checklist_instance_lines (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
