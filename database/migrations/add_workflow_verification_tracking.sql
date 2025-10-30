-- Migration: Add Workflow-Verification Tracking
-- Purpose: Link verification sessions to workflow sessions and track individual serial verifications
-- Date: 2025-10-30

-- Step 1: Add workflow_session_id to serial_assignments table
-- This links all serials in a workflow batch together
ALTER TABLE eyefidb.serial_assignments
ADD COLUMN IF NOT EXISTS workflow_session_id VARCHAR(36) NULL COMMENT 'UUID linking all serials in this workflow batch',
ADD INDEX idx_workflow_session (workflow_session_id);

-- Step 2: Create serial_verification_details table
-- This tracks which specific serial was verified in which photo
CREATE TABLE IF NOT EXISTS eyefidb.serial_verification_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    verification_session_id VARCHAR(36) NOT NULL COMMENT 'Reference to verification_sessions.id',
    assignment_id INT NULL COMMENT 'Reference to serial_assignments.id (NULL for workflow mode)',
    serial_number VARCHAR(50) NOT NULL COMMENT 'The actual serial that was verified (EyeFi or UL)',
    serial_type ENUM('eyefi', 'ul') NOT NULL COMMENT 'Type of serial number',
    photo_number INT NOT NULL COMMENT 'Which photo captured this serial (1, 2, 3...)',
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When this serial was captured',
    verified_by VARCHAR(100) NULL COMMENT 'User who performed verification',
    
    INDEX idx_verification_session (verification_session_id),
    INDEX idx_assignment (assignment_id),
    INDEX idx_serial_number (serial_number),
    
    FOREIGN KEY (verification_session_id) REFERENCES eyefidb.verification_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks individual serial number verifications within a session';

-- Step 3: Add workflow_session_id to verification_sessions
-- This links the verification session back to the workflow batch
ALTER TABLE eyefidb.verification_sessions
ADD COLUMN IF NOT EXISTS workflow_session_id VARCHAR(36) NULL COMMENT 'Links verification to workflow batch',
ADD INDEX idx_workflow_session (workflow_session_id);

-- Step 4: Add verification tracking columns to serial_assignments
ALTER TABLE eyefidb.serial_assignments
ADD COLUMN IF NOT EXISTS verified_in_photo INT NULL COMMENT 'Which photo number verified this serial',
ADD COLUMN IF NOT EXISTS verification_detail_id INT NULL COMMENT 'Reference to serial_verification_details.id';

COMMIT;
