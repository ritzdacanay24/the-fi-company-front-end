-- Migration: Add sample_videos JSON column to checklist_items
-- Date: 2025-11-25
-- Description: Adds sample_videos JSON column to support multiple sample reference videos per checklist item

-- Add the new sample_videos JSON column
ALTER TABLE checklist_items 
ADD COLUMN sample_videos JSON DEFAULT NULL AFTER sample_images
COMMENT 'Array of sample video objects with url, label, description, type, is_primary, order_index, duration_seconds';
