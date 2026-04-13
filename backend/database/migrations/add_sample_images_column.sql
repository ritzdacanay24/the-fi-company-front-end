-- Migration: Add sample_images JSON column to checklist_items
-- Date: 2025-08-18
-- Description: Adds sample_images JSON column to support multiple sample images per checklist item

-- Add the new sample_images JSON column
ALTER TABLE checklist_items 
ADD COLUMN sample_images JSON AFTER sample_image_url
COMMENT 'Array of sample image objects with url, label, description, type, is_primary, order_index';

-- Migrate existing data: convert single URLs to JSON array format
UPDATE checklist_items 
SET sample_images = JSON_ARRAY(
    JSON_OBJECT(
        'url', sample_image_url,
        'label', 'Sample Image',
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

-- Optional: Keep the old column for backward compatibility
-- If you want to remove it later, uncomment the following line:
-- ALTER TABLE checklist_items DROP COLUMN sample_image_url;
