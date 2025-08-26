-- Photo Checklist Configuration Management System
-- Migration Script: Creates tables for configurable photo checklists
-- Version: 1.0
-- Date: 2025-01-24

-- ==============================================
-- 1. Checklist Templates Table
-- ==============================================
CREATE TABLE IF NOT EXISTS checklist_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    part_number VARCHAR(100),
    product_type VARCHAR(100),
    category ENUM('quality_control', 'installation', 'maintenance', 'inspection') DEFAULT 'quality_control',
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_part_number (part_number),
    INDEX idx_product_type (product_type),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 2. Checklist Items Table (Template Items)
-- ==============================================
CREATE TABLE IF NOT EXISTS checklist_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    photo_requirements JSON,
    sample_image_url VARCHAR(500),
    is_required BOOLEAN DEFAULT TRUE,
    validation_rules JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE,
    INDEX idx_template_order (template_id, order_index),
    INDEX idx_required (is_required)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 3. Checklist Instances Table (Active Checklists)
-- ==============================================
CREATE TABLE IF NOT EXISTS checklist_instances (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    work_order_number VARCHAR(100) NOT NULL,
    part_number VARCHAR(100),
    serial_number VARCHAR(100),
    operator_id INT,
    operator_name VARCHAR(100),
    status ENUM('draft', 'in_progress', 'review', 'completed', 'submitted') DEFAULT 'draft',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    submitted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
    INDEX idx_work_order (work_order_number),
    INDEX idx_serial_number (serial_number),
    INDEX idx_status (status),
    INDEX idx_operator (operator_id),
    INDEX idx_dates (created_at, completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 4. Photo Submissions Table
-- ==============================================
CREATE TABLE IF NOT EXISTS photo_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    instance_id INT NOT NULL,
    item_id INT NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    file_type ENUM('image', 'video') DEFAULT 'image',
    file_size INT,
    mime_type VARCHAR(100),
    photo_metadata JSON,
    submission_notes TEXT,
    is_approved BOOLEAN NULL,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES checklist_items(id),
    INDEX idx_instance_item (instance_id, item_id),
    INDEX idx_file_type (file_type),
    INDEX idx_approval (is_approved),
    INDEX idx_review (reviewed_by, reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 5. Audit Log Table
-- ==============================================
CREATE TABLE IF NOT EXISTS checklist_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    instance_id INT,
    action ENUM('created', 'started', 'photo_added', 'photo_removed', 'completed', 'submitted', 'reviewed') NOT NULL,
    user_id INT,
    user_name VARCHAR(100),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE,
    INDEX idx_instance (instance_id),
    INDEX idx_action (action),
    INDEX idx_user (user_id),
    INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 6. Configuration Settings Table
-- ==============================================
CREATE TABLE IF NOT EXISTS checklist_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (config_key),
    INDEX idx_type (config_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 7. Insert Default Configuration
-- ==============================================
INSERT INTO checklist_config (config_key, config_value, description, config_type) VALUES
('max_photo_size_mb', '10', 'Maximum photo file size in MB', 'number'),
('allowed_photo_types', '["image/jpeg", "image/png", "image/webp"]', 'Allowed photo MIME types', 'json'),
('allowed_video_types', '["video/mp4", "video/webm", "video/ogg"]', 'Allowed video MIME types', 'json'),
('photo_quality_min', '80', 'Minimum photo quality percentage', 'number'),
('auto_submit_on_complete', 'false', 'Auto-submit checklist when all photos are taken', 'boolean'),
('require_review_before_submit', 'true', 'Require review step before final submission', 'boolean'),
('photo_compression_enabled', 'true', 'Enable automatic photo compression', 'boolean'),
('photo_compression_quality', '85', 'Photo compression quality (1-100)', 'number');

-- ==============================================
-- 8. Insert Sample Template Data
-- ==============================================
INSERT INTO checklist_templates (name, description, part_number, product_type, category) VALUES
('IGT Video Wall Standard QC', 'Standard quality control checklist for IGT video wall installations', 'VWL-03513', 'Video Wall', 'quality_control'),
('ATI Football Display QC', 'Quality control checklist for ATI football displays', 'CTO-03519', 'Football Display', 'quality_control'),
('General Installation QC', 'Generic quality control checklist for installations', 'GENERIC', 'Generic', 'quality_control');

-- Insert sample checklist items for the first template
INSERT INTO checklist_items (template_id, order_index, title, description, photo_requirements, is_required) VALUES
(1, 1, 'Serial Tag, UL Label, and Main Power Switch', 'Picture of serial Tag, UL Label, and Main Power Switch (360 & Wedge)', '{"angle": "front", "distance": "close", "lighting": "good", "focus": "serial_numbers"}', true),
(1, 2, 'Inside of Sign - Sending Card Side', 'Picture of Inside of the Sign - Sending Card Side', '{"angle": "interior", "distance": "medium", "lighting": "good", "focus": "components"}', true),
(1, 3, 'Inside of Sign - Opposite Side', 'Picture of Inside of the Sign - Opposite Side', '{"angle": "interior", "distance": "medium", "lighting": "good", "focus": "wiring"}', true),
(1, 4, 'Power Supply Area', 'Clear picture of power supply and connections', '{"angle": "interior", "distance": "close", "lighting": "good", "focus": "power_supply"}', true),
(1, 5, 'Cable Management', 'Picture showing proper cable routing and management', '{"angle": "interior", "distance": "medium", "lighting": "good", "focus": "cables"}', true);
