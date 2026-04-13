-- Training Scan Logging Table
-- For auditing and troubleshooting badge scan attempts

CREATE TABLE training_scan_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    badge_number VARCHAR(50) NOT NULL,
    employee_id INT NULL,
    scan_result ENUM('SUCCESS', 'BADGE_NOT_FOUND', 'ALREADY_SIGNED_IN', 'SESSION_NOT_FOUND', 'DATABASE_ERROR', 'VALIDATION_ERROR', 'TOO_EARLY', 'TOO_LATE') NOT NULL,
    ip_address VARCHAR(45) NULL,
    device_info TEXT NULL,
    scan_timestamp DATETIME NOT NULL,
    
    INDEX idx_session_id (session_id),
    INDEX idx_badge_number (badge_number),
    INDEX idx_scan_timestamp (scan_timestamp),
    INDEX idx_scan_result (scan_result)
);

-- Add foreign key constraint
ALTER TABLE training_scan_log 
ADD CONSTRAINT fk_scan_log_session 
FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE;