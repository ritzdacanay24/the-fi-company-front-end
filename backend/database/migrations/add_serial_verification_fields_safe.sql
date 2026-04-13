-- Migration: Add Serial Verification Fields (Safe Version)
-- Description: Adds fields to track physical verification of serial numbers via tablet companion system
-- Created: 2025-10-29
-- Updated: Safe version that checks for existing columns/tables before creating

-- Add verification columns to serial_assignments table (only if they don't exist)
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND COLUMN_NAME = 'requires_verification') = 0,
    'ALTER TABLE serial_assignments ADD COLUMN requires_verification BOOLEAN DEFAULT 0 COMMENT "Whether this assignment requires physical verification"',
    'SELECT "Column requires_verification already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND COLUMN_NAME = 'verification_photo') = 0,
    'ALTER TABLE serial_assignments ADD COLUMN verification_photo VARCHAR(255) DEFAULT NULL COMMENT "File path to verification photo"',
    'SELECT "Column verification_photo already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND COLUMN_NAME = 'verified_at') = 0,
    'ALTER TABLE serial_assignments ADD COLUMN verified_at DATETIME DEFAULT NULL COMMENT "When serial was physically verified"',
    'SELECT "Column verified_at already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND COLUMN_NAME = 'verified_by') = 0,
    'ALTER TABLE serial_assignments ADD COLUMN verified_by VARCHAR(100) DEFAULT NULL COMMENT "Who verified the serial"',
    'SELECT "Column verified_by already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND COLUMN_NAME = 'verification_session_id') = 0,
    'ALTER TABLE serial_assignments ADD COLUMN verification_session_id VARCHAR(50) DEFAULT NULL COMMENT "Session ID linking desktop and tablet"',
    'SELECT "Column verification_session_id already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND COLUMN_NAME = 'verification_status') = 0,
    'ALTER TABLE serial_assignments ADD COLUMN verification_status ENUM("pending", "verified", "failed", "skipped") DEFAULT "pending" COMMENT "Verification status"',
    'SELECT "Column verification_status already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Add indexes (only if they don't exist)
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND INDEX_NAME = 'idx_verification_session') = 0,
    'ALTER TABLE serial_assignments ADD INDEX idx_verification_session (verification_session_id)',
    'SELECT "Index idx_verification_session already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND INDEX_NAME = 'idx_verification_status') = 0,
    'ALTER TABLE serial_assignments ADD INDEX idx_verification_status (verification_status)',
    'SELECT "Index idx_verification_status already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'serial_assignments'
     AND INDEX_NAME = 'idx_requires_verification') = 0,
    'ALTER TABLE serial_assignments ADD INDEX idx_requires_verification (requires_verification)',
    'SELECT "Index idx_requires_verification already exists" AS msg'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Create verification sessions table
CREATE TABLE IF NOT EXISTS verification_sessions (
    id VARCHAR(50) PRIMARY KEY COMMENT 'Unique session ID (UUID)',
    assignment_id INT DEFAULT NULL COMMENT 'Foreign key to serial_assignments (NULL for workflow verification before DB save)',
    expected_serial VARCHAR(100) NOT NULL COMMENT 'The serial number we expect to see',
    expected_ul VARCHAR(100) DEFAULT NULL COMMENT 'The expected UL number for reference',
    session_status ENUM('active', 'completed', 'expired') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME COMMENT 'Session expiration time (5 minutes)',
    verified_at DATETIME DEFAULT NULL,
    captured_serial VARCHAR(100) DEFAULT NULL COMMENT 'Serial extracted from photo by OCR',
    match_result ENUM('match', 'mismatch', 'pending') DEFAULT 'pending',
    photo_path VARCHAR(255) DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    INDEX idx_assignment (assignment_id),
    INDEX idx_status (session_status),
    INDEX idx_expires (expires_at),
    FOREIGN KEY (assignment_id) REFERENCES serial_assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks verification sessions between desktop and tablet (supports workflow verification before DB save)';

-- Create verification audit log
CREATE TABLE IF NOT EXISTS verification_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    assignment_id INT DEFAULT NULL COMMENT 'Can be NULL for workflow verification',
    action VARCHAR(50) NOT NULL COMMENT 'session_created, photo_uploaded, ocr_completed, verification_completed, session_expired',
    details JSON DEFAULT NULL COMMENT 'Additional action details',
    performed_by VARCHAR(100) DEFAULT NULL,
    performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_assignment (assignment_id),
    INDEX idx_action (action),
    FOREIGN KEY (assignment_id) REFERENCES serial_assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Audit trail for verification activities';

-- Add comment to explain the verification workflow
ALTER TABLE serial_assignments 
COMMENT = 'Serial number assignments with physical verification support via tablet companion system';

-- Success message
SELECT 'Migration completed successfully! All verification fields and tables are ready.' AS status;
