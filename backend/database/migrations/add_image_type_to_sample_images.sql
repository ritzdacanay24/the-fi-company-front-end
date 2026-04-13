-- Migration: Add image_type categorization to sample_images
-- Date: 2025-11-13
-- Description: Add image_type field to differentiate between sample, reference, defect examples, and diagrams
--              Also add constraints to ensure only 1 primary sample image per item

-- Note: Since sample_images is stored as JSON in checklist_items table,
-- this is a documentation of the JSON structure change.
-- The actual enforcement will be done in the application layer (PHP backend validation)

/*
New JSON structure for sample_images column in checklist_items:

[
  {
    "url": "https://...",
    "label": "Primary Sample Image",
    "description": "This is what users should replicate",
    "type": "photo",
    "image_type": "sample",        -- NEW: 'sample', 'reference', 'defect_example', 'diagram'
    "is_primary": true,             -- Only ONE sample image can have is_primary=true
    "order_index": 0
  },
  {
    "url": "https://...",
    "label": "Reference - Side View",
    "description": "Shows alternative angle",
    "type": "photo",
    "image_type": "reference",      -- NEW
    "is_primary": false,
    "order_index": 1
  }
]

Business Rules:
1. Only ONE image per item can have is_primary=true AND image_type='sample'
2. Maximum 1 sample image (is_primary=true)
3. Maximum 5 reference images (image_type='reference', 'defect_example', 'diagram')
4. Total maximum 6 images per item (1 sample + 5 reference)

These rules will be enforced in photo-checklist-config.php validation
*/

-- Add index on template_id for better query performance (if not exists)
-- Check if index exists first
SELECT COUNT(1) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = DATABASE() 
  AND table_name = 'checklist_items' 
  AND index_name = 'idx_checklist_items_template_id';

SET @sql = IF(@index_exists = 0,
    'CREATE INDEX idx_checklist_items_template_id ON checklist_items(template_id)',
    'SELECT "Index already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add comment to sample_images column to document structure
-- Note: JSON validation will be done in application layer since MySQL JSON constraints are complex
ALTER TABLE checklist_items 
MODIFY COLUMN sample_images JSON 
COMMENT 'JSON array of sample/reference images. Structure: [{url, label, description, type, image_type, is_primary, order_index}]. Max 1 primary sample + 5 reference images.';

-- Migration complete
SELECT 'Migration completed: image_type field added to sample_images JSON structure' AS status;
