-- Fix is_production default values for existing owners
-- Date: 2025-11-21
-- Description: Set is_production to 0 for all owners except those explicitly marked as working

-- First, check if column exists
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'owners' AND COLUMN_NAME = 'is_production';

-- Set all owners to NOT working by default (0)
UPDATE owners SET is_production = 0 WHERE is_production IS NULL OR is_production = 1;

-- If you want to keep SHIPPING as working, uncomment this:
-- UPDATE owners SET is_production = 1 WHERE name = 'SHIPPING';

-- Verify the changes
SELECT id, name, is_active, is_production FROM owners ORDER BY display_order;
