-- Migration: Create audit log table for material request status changes
-- This table tracks all status changes in the Kanban workflow

CREATE TABLE IF NOT EXISTS mrf_status_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mrf_id INT NOT NULL,
    old_status ENUM('new', 'under_validation', 'pending_review', 'approved', 'picking', 'complete', 'cancelled') NOT NULL,
    new_status ENUM('new', 'under_validation', 'pending_review', 'approved', 'picking', 'complete', 'cancelled') NOT NULL,
    changed_by INT NULL,
    changed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    
    INDEX idx_mrf_id (mrf_id),
    INDEX idx_old_status (old_status),
    INDEX idx_new_status (new_status),
    INDEX idx_changed_by (changed_by),
    INDEX idx_changed_date (changed_date),
    
    FOREIGN KEY (mrf_id) REFERENCES mrf(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add composite index for common query patterns
CREATE INDEX idx_mrf_status_audit_composite ON mrf_status_audit_log (mrf_id, changed_date);

-- Optional: Add a trigger to automatically log status changes
DELIMITER $$
CREATE TRIGGER `log_status_changes` 
AFTER UPDATE ON `mrf`
FOR EACH ROW
BEGIN
    -- Log status change if queue_status has changed
    IF OLD.queue_status != NEW.queue_status THEN
        INSERT INTO mrf_status_audit_log (mrf_id, old_status, new_status, changed_by, changed_date)
        VALUES (NEW.id, OLD.queue_status, NEW.queue_status, NEW.modifiedBy, NOW());
    END IF;
END$$
DELIMITER ;
