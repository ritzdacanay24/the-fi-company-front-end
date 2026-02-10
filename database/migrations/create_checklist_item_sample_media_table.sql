-- Migration: Create checklist_item_sample_media table
-- Date: 2026-01-29
-- Description: Creates a dedicated table for sample media (images/videos) with per-media requirements
--              This replaces the JSON columns (sample_images, sample_videos) for better scalability

-- Create the new sample media table
CREATE TABLE IF NOT EXISTS checklist_item_sample_media (
    id INT PRIMARY KEY AUTO_INCREMENT,
    checklist_item_id INT NOT NULL,
    
    -- Media identification
    media_type ENUM('image', 'video') NOT NULL,
    media_category ENUM('primary_sample', 'reference', 'diagram', 'defect_example') NOT NULL,
    url VARCHAR(500) NOT NULL,
    label VARCHAR(255) NULL,
    description TEXT NULL,
    order_index INT DEFAULT 0,
    
    -- Per-media requirements (NULL = inherit from item defaults or not applicable)
    required_for_submission BOOLEAN DEFAULT 0 COMMENT 'Must user replicate THIS specific photo/video?',
    angle VARCHAR(50) NULL COMMENT 'Required viewing angle: front, back, side, top, bottom, diagonal',
    distance VARCHAR(50) NULL COMMENT 'Required capture distance: close, medium, far',
    lighting VARCHAR(50) NULL COMMENT 'Required lighting: bright, normal, dim',
    focus VARCHAR(255) NULL COMMENT 'Specific focus area description',
    max_duration_seconds INT NULL COMMENT 'For videos only: maximum allowed duration',
    
    -- Metadata
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_item_id (checklist_item_id),
    INDEX idx_media_type (media_type),
    INDEX idx_media_category (media_category),
    INDEX idx_item_type_category (checklist_item_id, media_type, media_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores sample media (images/videos) for checklist items with individual requirements';

-- NOTE: Data migration from JSON columns requires MySQL 8+ (JSON_TABLE) or a custom script.
-- If you're on MySQL 5.7, create the table first, then migrate using application code or a one-off script.

-- Optional (MySQL 8+): migrate JSON arrays into the new table using JSON_TABLE.
-- Optional (MySQL 8+): add default_*_requirements columns and copy existing JSON.

-- Note: Keep old columns (sample_images, sample_videos, photo_requirements) for backward compatibility
-- They can be dropped in a future migration after confirming everything works:
-- ALTER TABLE checklist_items DROP COLUMN sample_images;
-- ALTER TABLE checklist_items DROP COLUMN sample_videos;
-- ALTER TABLE checklist_items DROP COLUMN photo_requirements;
-- ALTER TABLE checklist_items DROP COLUMN video_requirements;
