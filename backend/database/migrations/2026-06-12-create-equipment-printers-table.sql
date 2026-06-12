CREATE TABLE equipment_printers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ip_address VARCHAR(50) NOT NULL UNIQUE,
  model VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  device_id VARCHAR(100),
  active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert the printers
INSERT INTO equipment_printers (ip_address, model, location, device_id, active)
VALUES 
  ('10.1.0.222', 'bizhub450i', 'Office Main', '_111_000_INF000', true),
  ('10.1.0.221', 'bizhub C361i', 'Office Secondary', NULL, true),
  ('10.1.0.23', 'bizhub', 'Unassigned', NULL, true),
  ('10.1.0.229', 'bizhub', 'Unassigned', NULL, true),
  ('10.1.0.83', 'bizhub', 'Unassigned', NULL, true),
  ('10.1.0.182', 'bizhub', 'Unassigned', NULL, true);
