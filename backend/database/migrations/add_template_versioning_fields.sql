-- Migration: Add template versioning fields
-- Date: 2025-11-10
-- Description: Adds parent_template_id and template_group_id to track template version history

-- Add parent_template_id column (tracks direct parent version)
ALTER TABLE checklist_templates 
ADD COLUMN parent_template_id INT NULL AFTER version,
ADD INDEX idx_parent_template_id (parent_template_id),
ADD CONSTRAINT fk_parent_template 
    FOREIGN KEY (parent_template_id) 
    REFERENCES checklist_templates(id) 
    ON DELETE SET NULL;

-- Add template_group_id column (groups all versions together)
ALTER TABLE checklist_templates 
ADD COLUMN template_group_id INT NULL AFTER parent_template_id,
ADD INDEX idx_template_group_id (template_group_id);

-- Update existing templates to set template_group_id to their own ID (first version of each family)
UPDATE checklist_templates 
SET template_group_id = id 
WHERE template_group_id IS NULL;

-- Make template_group_id NOT NULL after backfilling
ALTER TABLE checklist_templates 
MODIFY COLUMN template_group_id INT NOT NULL;

-- Verify the changes
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_KEY,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'checklist_templates' 
    AND COLUMN_NAME IN ('parent_template_id', 'template_group_id', 'version')
ORDER BY ORDINAL_POSITION;
