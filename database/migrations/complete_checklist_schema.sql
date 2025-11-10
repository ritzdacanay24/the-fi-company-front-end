-- =====================================================
-- Photo Checklist System - Complete Schema
-- =====================================================
-- Description: Complete database schema for the Photo Checklist Configuration Management System
-- Version: 2.0 (with hierarchical support)
-- Date: November 10, 2025
-- =====================================================

-- Drop existing tables in reverse order of dependencies (for clean reinstall)
-- Uncomment the following lines if you want to drop and recreate all tables
/*
DROP TABLE IF EXISTS checklist_upload_log;
DROP TABLE IF EXISTS checklist_audit_log;
DROP TABLE IF EXISTS photo_submissions;
DROP TABLE IF EXISTS checklist_instances;
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS checklist_config;
DROP TABLE IF EXISTS checklist_templates;
*/

-- =====================================================
-- 1. CHECKLIST TEMPLATES
-- =====================================================
-- Main template definition for checklists
CREATE TABLE IF NOT EXISTS checklist_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT 'Display name for the template',
    description TEXT COMMENT 'Detailed description of what the template covers',
    part_number VARCHAR(100) COMMENT 'Associated part number (optional, can be GENERIC)',
    product_type VARCHAR(100) COMMENT 'Product classification',
    category ENUM('quality_control', 'installation', 'maintenance', 'inspection') DEFAULT 'quality_control' COMMENT 'Type of checklist',
    version VARCHAR(20) DEFAULT '1.0' COMMENT 'Version string (auto-incremented on updates)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether template is available for creating new instances',
    created_by INT COMMENT 'User ID who created the template',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_part_number (part_number),
    INDEX idx_product_type (product_type),
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Main checklist template definitions';

-- =====================================================
-- 2. CHECKLIST ITEMS
-- =====================================================
-- Individual inspection items within a template
-- Supports hierarchical structure (parent-child)
CREATE TABLE IF NOT EXISTS checklist_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL COMMENT 'Reference to parent template',
    order_index DECIMAL(10,1) NOT NULL DEFAULT 0 COMMENT 'Display order (supports decimals: 14, 14.1, 14.2, etc.)',
    parent_id INT NULL DEFAULT NULL COMMENT 'References parent items order_index (NULL for root items)',
    level TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Hierarchy level: 0=parent/root, 1=child/sub-item',
    title VARCHAR(500) NOT NULL COMMENT 'Item title/name',
    description TEXT COMMENT 'Detailed instructions for this inspection item',
    photo_requirements JSON COMMENT 'JSON object defining photo capture requirements',
    sample_image_url VARCHAR(500) COMMENT 'Single primary sample image URL (preferred format)',
    sample_images JSON COMMENT 'Array of sample images (legacy/extended support)',
    is_required BOOLEAN DEFAULT TRUE COMMENT 'Whether this item must be completed',
    validation_rules JSON COMMENT 'Additional validation rules (JSON)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE,
    INDEX idx_template_order (template_id, order_index),
    INDEX idx_parent (parent_id),
    INDEX idx_level (level),
    INDEX idx_required (is_required)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual inspection items with hierarchical support';

-- =====================================================
-- 3. CHECKLIST INSTANCES
-- =====================================================
-- Active checklist executions (work order specific)
CREATE TABLE IF NOT EXISTS checklist_instances (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL COMMENT 'Reference to checklist template',
    work_order_number VARCHAR(100) NOT NULL COMMENT 'Associated work order',
    part_number VARCHAR(100) COMMENT 'Part number being inspected',
    serial_number VARCHAR(100) COMMENT 'Serial number of the specific unit',
    operator_id INT COMMENT 'User ID performing the inspection',
    operator_name VARCHAR(100) COMMENT 'Operators name (cached)',
    status ENUM('draft', 'in_progress', 'review', 'completed', 'submitted') DEFAULT 'draft' COMMENT 'Current status of the checklist',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Calculated completion percentage (0-100)',
    started_at TIMESTAMP NULL COMMENT 'When work began',
    completed_at TIMESTAMP NULL COMMENT 'When all required items were completed',
    submitted_at TIMESTAMP NULL COMMENT 'Final submission timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
    INDEX idx_work_order (work_order_number),
    INDEX idx_serial_number (serial_number),
    INDEX idx_part_number (part_number),
    INDEX idx_status (status),
    INDEX idx_operator (operator_id),
    INDEX idx_dates (created_at, completed_at),
    INDEX idx_composite (work_order_number, template_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Active checklist executions';

-- =====================================================
-- 4. PHOTO SUBMISSIONS
-- =====================================================
-- Photos uploaded for checklist items
CREATE TABLE IF NOT EXISTS photo_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    instance_id INT NOT NULL COMMENT 'Reference to checklist instance',
    item_id INT NOT NULL COMMENT 'Reference to checklist item',
    file_name VARCHAR(255) COMMENT 'Original filename',
    file_path VARCHAR(500) COMMENT 'Server-side file path',
    file_url VARCHAR(500) COMMENT 'Public URL for accessing the photo',
    file_type ENUM('image', 'video') DEFAULT 'image' COMMENT 'Type of media',
    file_size INT COMMENT 'File size in bytes',
    mime_type VARCHAR(100) COMMENT 'MIME type of the file',
    photo_metadata JSON COMMENT 'JSON containing EXIF data, dimensions, etc.',
    submission_notes TEXT COMMENT 'Optional notes from the operator',
    is_approved BOOLEAN NULL COMMENT 'Approval status (NULL=pending, true=approved, false=rejected)',
    reviewed_by INT NULL COMMENT 'User ID who reviewed the photo',
    reviewed_at TIMESTAMP NULL COMMENT 'Review timestamp',
    review_notes TEXT COMMENT 'Reviewers comments',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES checklist_items(id),
    INDEX idx_instance_item (instance_id, item_id),
    INDEX idx_file_type (file_type),
    INDEX idx_approval (is_approved),
    INDEX idx_review (reviewed_by, reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Photos uploaded for checklist items';

-- =====================================================
-- 5. CHECKLIST AUDIT LOG
-- =====================================================
-- Audit trail for all checklist actions
CREATE TABLE IF NOT EXISTS checklist_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    instance_id INT COMMENT 'Reference to checklist instance',
    action ENUM('created', 'started', 'photo_added', 'photo_removed', 'completed', 'submitted', 'reviewed') NOT NULL COMMENT 'Type of action performed',
    user_id INT COMMENT 'User who performed the action',
    user_name VARCHAR(100) COMMENT 'Users name (cached)',
    details JSON COMMENT 'Additional details in JSON format',
    ip_address VARCHAR(45) COMMENT 'IP address of the user',
    user_agent TEXT COMMENT 'Browser/device information',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE,
    INDEX idx_instance (instance_id),
    INDEX idx_action (action),
    INDEX idx_user (user_id),
    INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for all checklist actions';

-- =====================================================
-- 6. CHECKLIST CONFIG
-- =====================================================
-- System configuration settings
CREATE TABLE IF NOT EXISTS checklist_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Configuration key',
    config_value TEXT COMMENT 'Configuration value',
    description TEXT COMMENT 'Description of what this config does',
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT 'Data type of the value',
    is_system BOOLEAN DEFAULT FALSE COMMENT 'Whether this is a system config (non-editable)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (config_key),
    INDEX idx_type (config_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System configuration settings';

-- =====================================================
-- 7. CHECKLIST UPLOAD LOG
-- =====================================================
-- Track sample image uploads for checklist items
CREATE TABLE IF NOT EXISTS checklist_upload_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NULL COMMENT 'Reference to checklist item',
    template_id INT NULL COMMENT 'Reference to template',
    file_name VARCHAR(255) COMMENT 'Original filename',
    file_path VARCHAR(500) COMMENT 'Server-side file path',
    file_url VARCHAR(500) COMMENT 'Public URL for accessing the file',
    file_size INT COMMENT 'File size in bytes',
    mime_type VARCHAR(100) COMMENT 'MIME type of the file',
    upload_type ENUM('sample_image', 'submission_photo') DEFAULT 'sample_image' COMMENT 'Type of upload',
    uploaded_by INT COMMENT 'User ID who uploaded the file',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE SET NULL,
    INDEX idx_item (item_id),
    INDEX idx_template (template_id),
    INDEX idx_upload_type (upload_type),
    INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Track sample image uploads';

-- =====================================================
-- INSERT DEFAULT CONFIGURATION VALUES
-- =====================================================
INSERT INTO checklist_config (config_key, config_value, description, config_type, is_system) VALUES
('max_photo_size_mb', '10', 'Maximum photo file size in MB', 'number', false),
('allowed_photo_types', '["image/jpeg", "image/png", "image/webp"]', 'Allowed photo MIME types', 'json', false),
('allowed_video_types', '["video/mp4", "video/webm", "video/ogg"]', 'Allowed video MIME types', 'json', false),
('photo_quality_min', '80', 'Minimum photo quality percentage', 'number', false),
('auto_submit_on_complete', 'false', 'Auto-submit checklist when all photos are taken', 'boolean', false),
('require_review_before_submit', 'true', 'Require review step before final submission', 'boolean', false),
('photo_compression_enabled', 'true', 'Enable automatic photo compression', 'boolean', false),
('photo_compression_quality', '85', 'Photo compression quality (1-100)', 'number', false)
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- INSERT SAMPLE TEMPLATE DATA
-- =====================================================
-- Sample templates for testing and demonstration
INSERT INTO checklist_templates (name, description, part_number, product_type, category, version) VALUES
('IGT Video Wall Standard QC', 'Standard quality control checklist for IGT video wall installations', 'VWL-03513', 'Video Wall', 'quality_control', '1.0'),
('ATI Football Display QC', 'Quality control checklist for ATI football displays', 'CTO-03519', 'Football Display', 'quality_control', '1.0'),
('General Installation QC', 'Generic quality control checklist for installations', 'GENERIC', 'Generic', 'quality_control', '1.0')
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- INSERT SAMPLE CHECKLIST ITEMS
-- =====================================================
-- Sample items for the first template (IGT Video Wall)
INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, is_required) 
SELECT 
    t.id as template_id,
    1 as order_index,
    NULL as parent_id,
    0 as level,
    'Serial Tag, UL Label, and Main Power Switch' as title,
    'Picture of serial Tag, UL Label, and Main Power Switch (360 & Wedge)' as description,
    '{"angle": "front", "distance": "close", "lighting": "good", "focus": "serial_numbers", "min_photos": 1, "max_photos": 3}' as photo_requirements,
    true as is_required
FROM checklist_templates t 
WHERE t.name = 'IGT Video Wall Standard QC'
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description);

INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, is_required) 
SELECT 
    t.id as template_id,
    2 as order_index,
    NULL as parent_id,
    0 as level,
    'Inside of Sign - Sending Card Side' as title,
    'Picture of Inside of the Sign - Sending Card Side' as description,
    '{"angle": "interior", "distance": "medium", "lighting": "good", "focus": "components", "min_photos": 1, "max_photos": 5}' as photo_requirements,
    true as is_required
FROM checklist_templates t 
WHERE t.name = 'IGT Video Wall Standard QC'
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description);

INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, is_required) 
SELECT 
    t.id as template_id,
    3 as order_index,
    NULL as parent_id,
    0 as level,
    'Inside of Sign - Opposite Side' as title,
    'Picture of Inside of the Sign - Opposite Side' as description,
    '{"angle": "interior", "distance": "medium", "lighting": "good", "focus": "wiring", "min_photos": 1, "max_photos": 5}' as photo_requirements,
    true as is_required
FROM checklist_templates t 
WHERE t.name = 'IGT Video Wall Standard QC'
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description);

INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, is_required) 
SELECT 
    t.id as template_id,
    4 as order_index,
    NULL as parent_id,
    0 as level,
    'Power Supply Area' as title,
    'Clear picture of power supply and connections' as description,
    '{"angle": "interior", "distance": "close", "lighting": "good", "focus": "power_supply", "min_photos": 1, "max_photos": 3}' as photo_requirements,
    true as is_required
FROM checklist_templates t 
WHERE t.name = 'IGT Video Wall Standard QC'
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description);

INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, is_required) 
SELECT 
    t.id as template_id,
    5 as order_index,
    NULL as parent_id,
    0 as level,
    'Cable Management' as title,
    'Picture showing proper cable routing and management' as description,
    '{"angle": "interior", "distance": "medium", "lighting": "good", "focus": "cables", "min_photos": 1, "max_photos": 5}' as photo_requirements,
    true as is_required
FROM checklist_templates t 
WHERE t.name = 'IGT Video Wall Standard QC'
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description);

-- Example of hierarchical items (parent with children)
INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, is_required) 
SELECT 
    t.id as template_id,
    6 as order_index,
    NULL as parent_id,
    0 as level,
    'Connector Alignment Inspection' as title,
    'Verify all connectors are properly aligned and secure' as description,
    '{"angle": "close", "distance": "close", "lighting": "bright", "focus": "connectors", "min_photos": 1, "max_photos": 3}' as photo_requirements,
    true as is_required
FROM checklist_templates t 
WHERE t.name = 'IGT Video Wall Standard QC'
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description);

-- Child items (sub-items under item 6)
INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, is_required) 
SELECT 
    t.id as template_id,
    6.1 as order_index,
    6 as parent_id,
    1 as level,
    'Connector - Front View' as title,
    'Front view of connector alignment' as description,
    '{"angle": "front", "distance": "close", "lighting": "bright", "focus": "connector_pins", "min_photos": 1, "max_photos": 1}' as photo_requirements,
    true as is_required
FROM checklist_templates t 
WHERE t.name = 'IGT Video Wall Standard QC'
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description);

INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, is_required) 
SELECT 
    t.id as template_id,
    6.2 as order_index,
    6 as parent_id,
    1 as level,
    'Connector - Side View' as title,
    'Side view showing proper seating' as description,
    '{"angle": "side", "distance": "close", "lighting": "bright", "focus": "connector_seating", "min_photos": 1, "max_photos": 1}' as photo_requirements,
    true as is_required
FROM checklist_templates t 
WHERE t.name = 'IGT Video Wall Standard QC'
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the schema was created successfully

-- Check all tables were created
SELECT 
    TABLE_NAME, 
    TABLE_ROWS, 
    TABLE_COMMENT
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME LIKE 'checklist%'
ORDER BY TABLE_NAME;

-- Check configuration values
SELECT 
    config_key, 
    config_value, 
    config_type,
    description
FROM checklist_config
ORDER BY config_key;

-- Check sample templates
SELECT 
    id,
    name,
    part_number,
    category,
    version,
    is_active
FROM checklist_templates
ORDER BY id;

-- Check sample items (with hierarchy)
SELECT 
    ci.id,
    ct.name as template_name,
    ci.order_index,
    ci.level,
    ci.parent_id,
    ci.title,
    ci.is_required,
    CASE 
        WHEN ci.level = 0 THEN '📋 Parent'
        WHEN ci.level = 1 THEN '  └─ Child'
        ELSE 'Unknown'
    END as hierarchy
FROM checklist_items ci
JOIN checklist_templates ct ON ci.template_id = ct.id
ORDER BY ct.id, ci.order_index;

-- =====================================================
-- NOTES
-- =====================================================
/*
HIERARCHICAL STRUCTURE:
- level = 0: Parent/root items
- level = 1: Child/sub-items
- parent_id: References parent item's order_index (not id)
- order_index: Supports decimals (14, 14.1, 14.2, 15, 15.1, etc.)

SAMPLE DATA:
- 3 sample templates created
- Sample items for 'IGT Video Wall Standard QC' with hierarchical example
- Default configuration values

INDEXES:
- Performance-optimized for common queries
- Composite indexes for complex lookups
- Foreign key constraints ensure referential integrity

STATUS FLOW:
Templates: Draft → Active → Inactive → Archived
Instances: draft → in_progress → review → completed → submitted

JSON FIELDS:
- photo_requirements: Defines photo capture requirements
- sample_images: Array of sample image objects
- photo_metadata: EXIF data, dimensions, etc.
- validation_rules: Additional validation logic
- details: Audit log details

CASCADING DELETES:
- Deleting a template deletes all its items
- Deleting an instance deletes all its photos and audit logs
- Upload log uses SET NULL on delete

VERSION CONTROL:
- Templates create new versions on edit
- Previous versions remain available
- Quality document integration supported (via application layer)
*/

-- =====================================================
-- END OF SCHEMA
-- =====================================================
