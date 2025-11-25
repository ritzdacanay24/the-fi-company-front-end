-- Migration: Add submission_type column to checklist_items
-- Date: 2025-11-25
-- Description: Add separate submission_type column to control whether items accept photos, videos, or either
-- Values: 'photo', 'video', 'either'

ALTER TABLE checklist_items 
ADD COLUMN submission_type ENUM('photo', 'video', 'either') DEFAULT 'photo' AFTER photo_requirements
COMMENT 'Controls submission mode: photo only, video only, or either one (mutually exclusive)';

-- Add index for filtering by submission type
ALTER TABLE checklist_items ADD INDEX idx_submission_type (submission_type);
