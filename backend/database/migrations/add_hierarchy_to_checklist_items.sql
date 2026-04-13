-- Add parent-child hierarchy support to checklist_items table
-- This allows items to have sub-items (e.g., one inspection point with multiple reference photos)

ALTER TABLE checklist_items
ADD COLUMN parent_id INT NULL DEFAULT NULL AFTER order_index,
ADD COLUMN level TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER parent_id,
ADD INDEX idx_parent (parent_id),
ADD INDEX idx_level (level);

-- level = 0: Parent/root items (inspection points)
-- level = 1: Child/sub-items (reference photos, detailed views, etc.)
-- parent_id: References the order_index of the parent item (NOT the id)
-- This allows flexible ordering without complex foreign key constraints

-- Example structure:
-- Item 14 (order_index=14, parent_id=NULL, level=0) - "Check connector alignment"
--   └─ Item 14.1 (order_index=14.1, parent_id=14, level=1) - "Reference Photo 1"
--   └─ Item 14.2 (order_index=14.2, parent_id=14, level=1) - "Reference Photo 2"
--   └─ Item 14.3 (order_index=14.3, parent_id=14, level=1) - "Reference Photo 3"
