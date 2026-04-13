-- Migration: Add "Other" customer type
-- Purpose: Add a generic "Other" customer type for assignments without asset generation
-- Date: 2025-10-30
-- Author: System

-- Add "Other" customer type (ID will be 4)
INSERT INTO eyefidb.customer_types 
(customer_code, customer_name, requires_asset_generation, asset_generation_class, asset_table_name) 
VALUES
('other', 'Other', FALSE, NULL, NULL)
ON DUPLICATE KEY UPDATE 
    customer_name = 'Other',
    requires_asset_generation = FALSE,
    asset_generation_class = NULL,
    asset_table_name = NULL,
    active = TRUE;

-- Verify the customer types
SELECT 
    id,
    customer_code,
    customer_name,
    requires_asset_generation,
    asset_generation_class,
    asset_table_name,
    active
FROM eyefidb.customer_types
ORDER BY id;

-- Expected result:
-- id=1: igt (IGT)
-- id=2: sg (Light and Wonder) 
-- id=3: ags (AGS)
-- id=4: other (Other)
