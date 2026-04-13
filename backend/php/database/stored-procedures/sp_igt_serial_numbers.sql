-- =============================================
-- IGT Serial Numbers Management Procedures
-- =============================================

-- 1. Insert bulk serial numbers
CREATE OR ALTER PROCEDURE sp_InsertIGTSerialNumbers
    @SerialNumbersJSON NVARCHAR(MAX),
    @Category NVARCHAR(50) = 'gaming',
    @CreatedBy NVARCHAR(100) = NULL,
    @Manufacturer NVARCHAR(100) = NULL,
    @Model NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Results TABLE (
        SerialNumber NVARCHAR(100),
        Status NVARCHAR(20),
        Message NVARCHAR(255)
    );
    
    BEGIN TRY
        -- Parse JSON input
        INSERT INTO igt_serial_numbers (
            serial_number, 
            category, 
            manufacturer, 
            model, 
            created_by, 
            created_at,
            status
        )
        OUTPUT 
            INSERTED.serial_number,
            'success',
            'Serial number added successfully'
        INTO @Results
        SELECT DISTINCT
            UPPER(LTRIM(RTRIM(JSON_VALUE(value, '$.serialNumber')))),
            @Category,
            COALESCE(JSON_VALUE(value, '$.manufacturer'), @Manufacturer),
            COALESCE(JSON_VALUE(value, '$.model'), @Model),
            @CreatedBy,
            GETDATE(),
            'available'
        FROM OPENJSON(@SerialNumbersJSON)
        WHERE JSON_VALUE(value, '$.serialNumber') IS NOT NULL
        AND LEN(LTRIM(RTRIM(JSON_VALUE(value, '$.serialNumber')))) >= 3
        AND NOT EXISTS (
            SELECT 1 FROM igt_serial_numbers 
            WHERE serial_number = UPPER(LTRIM(RTRIM(JSON_VALUE(value, '$.serialNumber'))))
        );
        
        -- Return results summary
        SELECT 
            COUNT(*) as TotalProcessed,
            SUM(CASE WHEN Status = 'success' THEN 1 ELSE 0 END) as Successful,
            SUM(CASE WHEN Status = 'duplicate' THEN 1 ELSE 0 END) as Duplicates,
            SUM(CASE WHEN Status = 'error' THEN 1 ELSE 0 END) as Errors
        FROM @Results;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 2. Get available serial numbers
CREATE OR ALTER PROCEDURE sp_GetAvailableIGTSerialNumbers
    @Category NVARCHAR(50) = NULL,
    @Limit INT = 100
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@Limit)
        id,
        serial_number,
        category,
        status,
        manufacturer,
        model,
        notes,
        created_at,
        created_by
    FROM igt_serial_numbers
    WHERE status = 'available'
    AND is_active = 1
    AND (@Category IS NULL OR category = @Category)
    ORDER BY created_at ASC;
END;
GO

-- 3. Mark serial number as used
CREATE OR ALTER PROCEDURE sp_MarkIGTSerialNumberUsed
    @SerialNumber NVARCHAR(100),
    @UsedBy NVARCHAR(100),
    @AssetId BIGINT = NULL,
    @AssetNumber NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        UPDATE igt_serial_numbers
        SET 
            status = 'used',
            used_at = GETDATE(),
            used_by = @UsedBy,
            used_in_asset_id = @AssetId,
            used_in_asset_number = @AssetNumber,
            updated_at = GETDATE(),
            updated_by = @UsedBy
        WHERE serial_number = @SerialNumber
        AND status = 'available';
        
        IF @@ROWCOUNT = 0
        BEGIN
            RAISERROR('Serial number not found or not available', 16, 1);
        END
        
        SELECT 
            id,
            serial_number,
            status,
            used_at,
            used_by,
            used_in_asset_number
        FROM igt_serial_numbers
        WHERE serial_number = @SerialNumber;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- 4. Get serial number statistics
CREATE OR ALTER PROCEDURE sp_GetIGTSerialNumberStats
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used,
        SUM(CASE WHEN status IN ('expired', 'invalid') THEN 1 ELSE 0 END) as inactive
    FROM igt_serial_numbers
    WHERE is_active = 1
    GROUP BY category
    
    UNION ALL
    
    SELECT 
        'TOTAL' as category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used,
        SUM(CASE WHEN status IN ('expired', 'invalid') THEN 1 ELSE 0 END) as inactive
    FROM igt_serial_numbers
    WHERE is_active = 1;
END;
GO

-- 5. Delete serial numbers
CREATE OR ALTER PROCEDURE sp_DeleteIGTSerialNumbers
    @SerialNumberIds NVARCHAR(MAX),
    @DeletedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Soft delete (mark as inactive) for used serial numbers
        UPDATE igt_serial_numbers
        SET 
            is_active = 0,
            updated_at = GETDATE(),
            updated_by = @DeletedBy
        WHERE id IN (SELECT value FROM STRING_SPLIT(@SerialNumberIds, ','))
        AND status = 'used';
        
        -- Hard delete for unused serial numbers
        DELETE FROM igt_serial_numbers
        WHERE id IN (SELECT value FROM STRING_SPLIT(@SerialNumberIds, ','))
        AND status IN ('available', 'reserved');
        
        COMMIT TRANSACTION;
        
        SELECT @@ROWCOUNT as DeletedCount;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
