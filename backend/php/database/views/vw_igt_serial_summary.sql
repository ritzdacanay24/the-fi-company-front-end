-- IGT Serial Numbers Summary View
CREATE OR ALTER VIEW vw_IGTSerialNumberSummary
AS
SELECT 
    isn.id,
    isn.serial_number,
    isn.category,
    isn.status,
    isn.manufacturer,
    isn.model,
    isn.notes,
    isn.created_at,
    isn.created_by,
    isn.used_at,
    isn.used_by,
    isn.used_in_asset_number,
    -- Calculate days since creation
    DATEDIFF(DAY, isn.created_at, GETDATE()) as days_since_created,
    -- Calculate days since used (if applicable)
    CASE 
        WHEN isn.used_at IS NOT NULL 
        THEN DATEDIFF(DAY, isn.used_at, GETDATE()) 
        ELSE NULL 
    END as days_since_used,
    -- Status indicators
    CASE 
        WHEN isn.status = 'available' THEN 'Ready for use'
        WHEN isn.status = 'reserved' THEN 'Reserved for assignment'
        WHEN isn.status = 'used' THEN CONCAT('Used in asset: ', isn.used_in_asset_number)
        ELSE 'Inactive'
    END as status_description,
    isn.is_active
FROM igt_serial_numbers isn
WHERE isn.is_active = 1;
GO
