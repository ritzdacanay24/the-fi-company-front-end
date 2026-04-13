-- Populate owners table from existing workOrderOwner data
-- This migration extracts unique owners who have 10+ work orders

-- Step 1: Clear existing owners table
TRUNCATE TABLE owners;

-- Step 2: Insert owners from workOrderOwner table
-- Only include users with 10 or more work orders assigned
SET @row_number = 0;

INSERT INTO owners (name, display_order, is_active, created_by, created_at)
SELECT 
    userName as name,
    (@row_number:=@row_number + 1) as display_order,
    TRUE as is_active,
    'system' as created_by,
    CURRENT_TIMESTAMP as created_at
FROM (
    SELECT 
        userName,
        COUNT(*) as work_order_count,
        MAX(lastModDate) as last_modified
    FROM workOrderOwner 
    WHERE userName IS NOT NULL 
      AND userName != ''
    GROUP BY userName
    HAVING COUNT(*) >= 10
    ORDER BY COUNT(*) DESC, MAX(lastModDate) DESC
) AS ranked_owners;

-- Step 3: Verify the results
SELECT 
    id,
    name,
    display_order,
    is_active,
    created_at
FROM owners
ORDER BY display_order;

-- Step 4: Show summary
SELECT 
    COUNT(*) as total_owners_imported,
    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_owners
FROM owners;
