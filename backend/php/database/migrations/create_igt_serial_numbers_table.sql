-- IGT Serial Numbers Table
-- This table stores preloaded serial numbers for IGT asset creation
CREATE TABLE igt_serial_numbers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL DEFAULT 'gaming',
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    manufacturer VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NULL,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) NULL,
    used_at DATETIME NULL,
    used_by VARCHAR(100) NULL,
    used_in_asset_id BIGINT NULL,
    used_in_asset_number VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Indexes for performance
    INDEX idx_igt_serial_numbers_serial_number (serial_number),
    INDEX idx_igt_serial_numbers_status (status),
    INDEX idx_igt_serial_numbers_category (category),
    INDEX idx_igt_serial_numbers_created_at (created_at),
    INDEX idx_igt_serial_numbers_used_at (used_at),
    
    -- Constraints
    CONSTRAINT chk_igt_serial_numbers_status CHECK (status IN ('available', 'reserved', 'used', 'expired', 'invalid')),
    CONSTRAINT chk_igt_serial_numbers_category CHECK (category IN ('gaming', 'peripheral', 'system', 'other')),
    CONSTRAINT chk_igt_serial_numbers_serial_format CHECK (CHAR_LENGTH(serial_number) >= 3 AND serial_number REGEXP '^[A-Z0-9]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation
ALTER TABLE igt_serial_numbers COMMENT = 'Stores preloaded serial numbers for IGT asset creation and tracking';
ALTER TABLE igt_serial_numbers MODIFY COLUMN id BIGINT AUTO_INCREMENT COMMENT 'Unique identifier for the serial number record';
ALTER TABLE igt_serial_numbers MODIFY COLUMN serial_number VARCHAR(100) NOT NULL COMMENT 'The actual serial number (alphanumeric, minimum 3 characters)';
ALTER TABLE igt_serial_numbers MODIFY COLUMN category VARCHAR(50) NOT NULL DEFAULT 'gaming' COMMENT 'Category of equipment: gaming, peripheral, system, other';
ALTER TABLE igt_serial_numbers MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'available' COMMENT 'Status: available, reserved, used, expired, invalid';
ALTER TABLE igt_serial_numbers MODIFY COLUMN manufacturer VARCHAR(100) NULL COMMENT 'Equipment manufacturer (e.g., IGT, Aristocrat, Bally)';
ALTER TABLE igt_serial_numbers MODIFY COLUMN used_at DATETIME NULL COMMENT 'When the serial number was used in an IGT asset record';
ALTER TABLE igt_serial_numbers MODIFY COLUMN used_in_asset_id BIGINT NULL COMMENT 'Reference to the IGT asset record that used this serial number';

-- Sample data for testing
INSERT INTO igt_serial_numbers (
  serial_number,
  category,
  status,
  manufacturer,
  model,
  notes,
  created_by
) VALUES
('SN100001', 'gaming', 'used', 'IGT', 'G23', 'Used in asset IGT-2024-1001', 'admin'),
('SN100002', 'gaming', 'used', 'IGT', 'G23', 'Used in asset IGT-2024-1002', 'admin'),
('SN100003', 'gaming', 'available', 'IGT', 'G23', 'Available for assignment', 'admin'),
('SN100004', 'peripheral', 'available', 'IGT', 'Printer', 'Peripheral device', 'admin');
