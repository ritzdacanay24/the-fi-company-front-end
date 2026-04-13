-- Add reservation tracking fields to igt_serial_numbers table
-- These fields help track when and by whom serial numbers are temporarily reserved

ALTER TABLE igt_serial_numbers 
ADD COLUMN reserved_at DATETIME NULL 
COMMENT 'When the serial number was reserved (temporary hold)';

ALTER TABLE igt_serial_numbers 
ADD COLUMN reserved_by VARCHAR(100) NULL 
COMMENT 'User who reserved the serial number (temporary hold)';

-- Add index for performance when querying reserved serial numbers
ALTER TABLE igt_serial_numbers 
ADD INDEX idx_igt_serial_numbers_reserved_at (reserved_at);

-- Update the status constraint to include 'reserved'
ALTER TABLE igt_serial_numbers 
DROP CONSTRAINT chk_igt_serial_numbers_status;

ALTER TABLE igt_serial_numbers 
ADD CONSTRAINT chk_igt_serial_numbers_status 
CHECK (status IN ('available', 'reserved', 'used', 'expired', 'invalid'));

-- Clean up any old reservations (optional - run manually if needed)
-- UPDATE igt_serial_numbers 
-- SET status = 'available', reserved_at = NULL, reserved_by = NULL 
-- WHERE status = 'reserved' AND reserved_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE);
