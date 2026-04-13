-- Simple Migration: Just add void columns (NO TRIGGERS!)
-- Use the existing serial-availability API for audit tracking

-- Create audit table for void/delete/restore actions only
CREATE TABLE IF NOT EXISTS serial_assignment_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    action VARCHAR(50) NOT NULL COMMENT 'voided, deleted, restored',
    reason TEXT NULL COMMENT 'Reason for action',
    performed_by VARCHAR(100) NOT NULL COMMENT 'User who performed this action',
    performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_performed_at (performed_at),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks void/delete/restore actions only - serial_assignments table already tracks creation';

-- Add void columns to serial_assignments table
ALTER TABLE serial_assignments 
ADD COLUMN IF NOT EXISTS is_voided TINYINT(1) DEFAULT 0 COMMENT '0=active, 1=voided',
ADD COLUMN IF NOT EXISTS voided_by VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS voided_at DATETIME NULL,
ADD COLUMN IF NOT EXISTS void_reason TEXT NULL;

-- Add index for voided status
ALTER TABLE serial_assignments 
ADD INDEX IF NOT EXISTS idx_is_voided (is_voided);

-- That's it! No triggers needed.
-- The serial-availability API already handles creation tracking via serial_assignments inserts.
-- The serial-assignments API will handle void/restore actions and insert into audit table manually.
