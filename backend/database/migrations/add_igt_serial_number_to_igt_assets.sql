-- Add IGT serial number field to igt_assets table
-- This field stores the IGT-assigned serial number (separate from EyeFi serial number)

ALTER TABLE igt_assets 
ADD COLUMN igt_serial_number VARCHAR(100) NULL 
COMMENT 'IGT-assigned device serial number (separate from EyeFi serial number)';

-- Add index for performance
ALTER TABLE igt_assets 
ADD INDEX idx_igt_assets_igt_serial_number (igt_serial_number);

-- Update any existing records to have a placeholder value if needed
-- UPDATE igt_assets SET igt_serial_number = CONCAT('IGT-', id) WHERE igt_serial_number IS NULL;
