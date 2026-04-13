-- Field Service Audit Log Table
-- Tracks all changes to field service scheduler and team assignments

CREATE TABLE IF NOT EXISTS fs_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fs_det_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id INT NULL,
    user_name VARCHAR(255) NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fs_det_id (fs_det_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
