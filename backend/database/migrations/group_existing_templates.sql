-- Group existing templates with the same part number and fix version numbers
-- This groups templates IDs 79, 80, 81, 82, 83 (all with part number WDG-03528-100)
-- Template 79 is the oldest, so we'll use its ID (79) as the template_group_id for all

-- Step 1: Update template_group_id, parent_template_id, and version numbers
UPDATE checklist_templates 
SET template_group_id = 79,
    parent_template_id = CASE 
        WHEN id = 79 THEN NULL  -- First template has no parent
        WHEN id = 80 THEN 79    -- Second template's parent is 79
        WHEN id = 81 THEN 80    -- Third template's parent is 80
        WHEN id = 82 THEN 81    -- Fourth template's parent is 81
        WHEN id = 83 THEN 82    -- Fifth template's parent is 82
        ELSE parent_template_id
    END,
    version = CASE 
        WHEN id = 79 THEN '1.0'  -- First version
        WHEN id = 80 THEN '1.1'  -- Second version
        WHEN id = 81 THEN '1.2'  -- Third version
        WHEN id = 82 THEN '1.3'  -- Fourth version
        WHEN id = 83 THEN '1.4'  -- Fifth version (latest)
        ELSE version
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE part_number = 'WDG-03528-100' 
  AND id IN (79, 80, 81, 82, 83);

-- Step 2: Keep only the latest version active, deactivate older versions
UPDATE checklist_templates 
SET is_active = CASE 
        WHEN id = 83 THEN 1  -- Latest version stays active
        ELSE 0               -- Older versions become inactive
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE part_number = 'WDG-03528-100' 
  AND id IN (79, 80, 81, 82, 83);

-- Step 3: Verify the update
SELECT id, name, part_number, version, parent_template_id, template_group_id, is_active, created_at
FROM checklist_templates
WHERE part_number = 'WDG-03528-100'
ORDER BY id;
