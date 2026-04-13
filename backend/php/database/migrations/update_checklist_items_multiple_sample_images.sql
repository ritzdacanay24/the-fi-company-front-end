-- Migration: Update checklist_items to support multiple sample images
-- Date: 2025-08-13
-- Description: Changes sample_image_url (VARCHAR) to sample_images (JSON) to support multiple sample images per item

-- First, add the new column
ALTER TABLE checklist_items 
ADD COLUMN sample_images JSON AFTER sample_image_url;

-- Migrate existing data: convert single URLs to JSON array format
UPDATE checklist_items 
SET sample_images = JSON_ARRAY(
    JSON_OBJECT(
        'url', sample_image_url,
        'label', 'Sample 1',
        'description', '',
        'type', 'photo',
        'is_primary', true,
        'order_index', 0
    )
)
WHERE sample_image_url IS NOT NULL AND sample_image_url != '';

-- Set empty JSON array for items with no sample images
UPDATE checklist_items 
SET sample_images = JSON_ARRAY()
WHERE sample_image_url IS NULL OR sample_image_url = '';

-- Drop the old column (commented out for safety - uncomment after testing)
-- ALTER TABLE checklist_items DROP COLUMN sample_image_url;

-- Add comment to document the new structure
ALTER TABLE checklist_items 
MODIFY COLUMN sample_images JSON COMMENT 'Array of sample image objects with url, label, description, type, is_primary, order_index';
