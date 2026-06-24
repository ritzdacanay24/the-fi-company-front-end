-- Widen order_index from DECIMAL(10,5) to DECIMAL(24,20) to support
-- hierarchical outline numbering with 2-digit sub-level padding up to 10 levels deep.
-- DECIMAL(10,5) only has 5 decimal places, truncating values like 1.010102 (6 places)
-- to 1.01010, making siblings sort identically and revert on reload.
-- DECIMAL(24,20): 4 integer digits (up to 9999 root items) + 20 decimal places (10 nesting levels).
ALTER TABLE checklist_items
  MODIFY COLUMN order_index DECIMAL(24,20) NOT NULL DEFAULT 0;
