-- Migration: Create audit log table for material request review actions
-- This table tracks all administrative actions performed on reviews

CREATE TABLE IF NOT EXISTS mrf_review_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by INT NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_review_id (review_id),
    INDEX idx_action (action),
    INDEX idx_performed_by (performed_by),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (review_id) REFERENCES mrf_det_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add some sample audit actions for documentation
-- Actions include: 'reassigned', 'reminder_sent', 'escalated', 'cancelled', 'priority_changed'

-- Add index for common query patterns
CREATE INDEX idx_review_audit_composite ON mrf_review_audit_log (review_id, action, created_at);

-- Insert some initial audit records for existing reviews (optional)
-- This would track the initial assignment of reviews
INSERT INTO mrf_review_audit_log (review_id, action, performed_by, details, created_at)
SELECT 
    id,
    'assigned',
    NULL, -- System assignment
    JSON_OBJECT('initial_assignment', true),
    assigned_date
FROM mrf_det_reviews 
WHERE active = 1 
AND NOT EXISTS (
    SELECT 1 FROM mrf_review_audit_log 
    WHERE review_id = mrf_det_reviews.id 
    AND action = 'assigned'
);
