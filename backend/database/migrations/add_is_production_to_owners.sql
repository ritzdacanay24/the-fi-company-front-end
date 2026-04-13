-- Migration: Add is_production column to owners table
-- Date: 2025-11-21
-- Description: Add flag to track which owners are currently working on items (in production)

-- Add the column with default value of 0 (false/not working)
ALTER TABLE `owners` 
ADD COLUMN `is_production` TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Flag indicating if owner is currently working on items (1=working, 0=not working)' 
AFTER `is_active`;

-- Update comment for the table to document the new field
ALTER TABLE `owners` 
COMMENT = 'Stores owner information with status tracking including active status and current production work status';

-- Optional: Create index for faster querying of owners currently in production
CREATE INDEX `idx_is_production` ON `owners` (`is_production`, `is_active`);

-- Update active_owners view to include is_production field
CREATE OR REPLACE VIEW active_owners AS
SELECT 
    id,
    name,
    email,
    department,
    description,
    display_order,
    is_production
FROM owners
WHERE is_active = TRUE
ORDER BY display_order ASC, name ASC;

-- Rollback script (commented out - uncomment to rollback):
-- ALTER TABLE `owners` DROP COLUMN `is_production`;
-- DROP INDEX `idx_is_production` ON `owners`;
-- Recreate original view without is_production:
-- CREATE OR REPLACE VIEW active_owners AS
-- SELECT id, name, email, department, description, display_order
-- FROM owners WHERE is_active = TRUE ORDER BY display_order ASC, name ASC;
