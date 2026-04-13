-- Migration: Add checklist upload log table
-- Date: 2025-07-28
-- Description: Create table to track sample image uploads for checklist items

CREATE TABLE IF NOT EXISTS checklist_upload_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    item_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INT DEFAULT NULL,
    uploaded_by INT DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_template_id (template_id),
    INDEX idx_item_id (item_id),
    INDEX idx_uploaded_at (uploaded_at),
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE checklist_upload_log 
COMMENT = 'Log table for tracking sample image uploads for checklist items';
