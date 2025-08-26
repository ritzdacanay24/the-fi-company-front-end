-- IGT Assets Table
-- This table stores the main IGT asset records created through the form
CREATE TABLE igt_assets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    generated_IGT_asset VARCHAR(100) NULL,
    serial_number VARCHAR(100) NOT NULL,
    time_stamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    wo_number VARCHAR(100) NULL,
    property_site VARCHAR(200) NULL,
    igt_part_number VARCHAR(100) NULL,
    eyefi_part_number VARCHAR(100) NULL,
    inspector_name VARCHAR(100) NULL,
    last_update DATETIME NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    manual_update TEXT NULL,
    created_by VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) NULL,
    
    -- Foreign key to serial numbers table
    serial_number_id BIGINT NULL,
    
    -- Indexes for performance
    INDEX idx_igt_assets_serial_number (serial_number),
    INDEX idx_igt_assets_generated_asset (generated_IGT_asset),
    INDEX idx_igt_assets_wo_number (wo_number),
    INDEX idx_igt_assets_property_site (property_site),
    INDEX idx_igt_assets_created_at (created_at),
    INDEX idx_igt_assets_inspector (inspector_name),
    
    -- Constraints
    CONSTRAINT fk_igt_assets_serial_number FOREIGN KEY (serial_number_id) 
        REFERENCES igt_serial_numbers(id) ON DELETE SET NULL,
    CONSTRAINT chk_igt_assets_serial_format CHECK (CHAR_LENGTH(serial_number) >= 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation (MySQL style)
ALTER TABLE igt_assets COMMENT = 'Main table for IGT asset records created through the quality management system';
ALTER TABLE igt_assets MODIFY COLUMN id BIGINT AUTO_INCREMENT COMMENT 'Unique identifier for the IGT asset record';
ALTER TABLE igt_assets MODIFY COLUMN generated_IGT_asset VARCHAR(100) NULL COMMENT 'Auto-generated or manually entered IGT asset number';
ALTER TABLE igt_assets MODIFY COLUMN serial_number VARCHAR(100) NOT NULL COMMENT 'Device serial number from manufacturer';
ALTER TABLE igt_assets MODIFY COLUMN wo_number VARCHAR(100) NULL COMMENT 'Work order number for manufacturing/assembly';
ALTER TABLE igt_assets MODIFY COLUMN property_site VARCHAR(200) NULL COMMENT 'Gaming facility or casino where asset will be deployed';
ALTER TABLE igt_assets MODIFY COLUMN igt_part_number VARCHAR(100) NULL COMMENT 'Customer IGT part number reference';
ALTER TABLE igt_assets MODIFY COLUMN eyefi_part_number VARCHAR(100) NULL COMMENT 'Internal Eyefi part number reference';
ALTER TABLE igt_assets MODIFY COLUMN inspector_name VARCHAR(100) NULL COMMENT 'Quality control inspector assigned to this asset';
ALTER TABLE igt_assets MODIFY COLUMN manual_update TEXT NULL COMMENT 'Manual notes and updates for the asset record';
ALTER TABLE igt_assets MODIFY COLUMN serial_number_id BIGINT NULL COMMENT 'Reference to the preloaded serial number record if used';

-- Sample data for testing
INSERT INTO igt_assets (
  generated_IGT_asset,
  serial_number,
  wo_number,
  property_site,
  igt_part_number,
  eyefi_part_number,
  inspector_name,
  manual_update,
  active,
  created_by
) VALUES
(
  'IGT-2024-1001',
  'SN100001',
  'WO-2024-1001',
  'Caesars Palace',
  'IGT-PART-1001',
  'EYE-PART-1001',
  'Alice Johnson',
  'Asset created for Caesars Palace deployment.',
  1,
  'admin'
),
(
  'IGT-2024-1002',
  'SN100002',
  'WO-2024-1002',
  'Wynn Las Vegas',
  'IGT-PART-1002',
  'EYE-PART-1002',
  'Bob Lee',
  'Asset created for Wynn Las Vegas deployment.',
  1,
  'admin'
);
