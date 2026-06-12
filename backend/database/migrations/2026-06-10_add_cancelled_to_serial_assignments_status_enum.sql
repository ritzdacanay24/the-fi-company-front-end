-- Add cancelled back to the serial_assignments status enum
-- Keeps legacy returned rows valid while allowing the UI and backend to use cancelled

ALTER TABLE eyefidb.serial_assignments
MODIFY COLUMN status ENUM('active', 'consumed', 'cancelled', 'returned') DEFAULT 'consumed';
