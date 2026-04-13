-- Update photo_requirements JSON to include min_photos and max_photos defaults
-- Migration: Add photo limit validation fields to existing photo_requirements JSON
-- Date: 2025-07-28

-- Update existing checklist_items to include min_photos and max_photos in photo_requirements JSON
-- Only update items where photo_requirements is NULL or doesn't contain these fields
UPDATE checklist_items 
SET photo_requirements = JSON_OBJECT(
    'min_photos', 0,
    'max_photos', 10
)
WHERE photo_requirements IS NULL 
   OR JSON_EXTRACT(photo_requirements, '$.min_photos') IS NULL 
   OR JSON_EXTRACT(photo_requirements, '$.max_photos') IS NULL;
