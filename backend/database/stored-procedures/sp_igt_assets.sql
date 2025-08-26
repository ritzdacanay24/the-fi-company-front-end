-- =============================================
-- IGT Assets Management Procedures
-- =============================================

-- 1. Create new IGT asset
CREATE OR ALTER PROCEDURE sp_CreateIGTAsset
    @SerialNumber NVARCHAR(100),
    @GeneratedIGTAsset NVARCHAR(100) = NULL,
    @WONumber NVARCHAR(100) = NULL,
    @PropertySite NVARCHAR(200) = NULL,
    @IGTPartNumber NVARCHAR(100) = NULL,
    @EyefiPartNumber NVARCHAR(100) = NULL,
    @InspectorName NVARCHAR(100) = NULL,
    @ManualUpdate NVARCHAR(MAX) = NULL,
    @CreatedBy NVARCHAR(100) = NULL,
    @Active BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @SerialNumberId BIGINT = NULL;
    DECLARE @NewAssetId BIGINT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Check if serial number exists in preloaded serials and mark as used
        SELECT @SerialNumberId = id 
        FROM igt_serial_numbers 
        WHERE serial_number = @SerialNumber 
        AND status = 'available' 
        AND is_active = 1;
        
        IF @SerialNumberId IS NOT NULL
        BEGIN
            -- Mark serial number as used
            UPDATE igt_serial_numbers
            SET 
                status = 'used',
                used_at = GETDATE(),
                used_by = @CreatedBy,
                updated_at = GETDATE(),
                updated_by = @CreatedBy
            WHERE id = @SerialNumberId;
        END
        
        -- Generate IGT asset number if not provided
        IF @GeneratedIGTAsset IS NULL OR @GeneratedIGTAsset = ''
        BEGIN
            DECLARE @NextNumber INT;
            SELECT @NextNumber = ISNULL(MAX(CAST(RIGHT(generated_IGT_asset, 6) AS INT)), 0) + 1
            FROM igt_assets 
            WHERE generated_IGT_asset LIKE 'IGT%' 
            AND ISNUMERIC(RIGHT(generated_IGT_asset, 6)) = 1;
            
            SET @GeneratedIGTAsset = 'IGT' + FORMAT(@NextNumber, '000000');
        END
        
        -- Insert new IGT asset
        INSERT INTO igt_assets (
            generated_IGT_asset,
            serial_number,
            wo_number,
            property_site,
            igt_part_number,
            eyefi_part_number,
            inspector_name,
            manual_update,
            created_by,
            active,
            serial_number_id,
            time_stamp,
            created_at
        )
        VALUES (
            @GeneratedIGTAsset,
            @SerialNumber,
            @WONumber,
            @PropertySite,
            @IGTPartNumber,
            @EyefiPartNumber,
            @InspectorName,
            @ManualUpdate,
            @CreatedBy,
            @Active,
            @SerialNumberId,
            GETDATE(),
            GETDATE()
        );
        
        SET @NewAssetId = SCOPE_IDENTITY();
        
        -- Update serial number with asset reference if it was preloaded
        IF @SerialNumberId IS NOT NULL
        BEGIN
            UPDATE igt_serial_numbers
            SET 
                used_in_asset_id = @NewAssetId,
                used_in_asset_number = @GeneratedIGTAsset
            WHERE id = @SerialNumberId;
        END
        
        COMMIT TRANSACTION;
        
        -- Return the created asset
        SELECT 
            id,
            generated_IGT_asset,
            serial_number,
            wo_number,
            property_site,
            igt_part_number,
            eyefi_part_number,
            inspector_name,
            active,
            created_at,
            created_by
        FROM igt_assets
        WHERE id = @NewAssetId;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 2. Get IGT asset by ID
CREATE OR ALTER PROCEDURE sp_GetIGTAssetById
    @AssetId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ia.id,
        ia.generated_IGT_asset,
        ia.serial_number,
        ia.time_stamp,
        ia.wo_number,
        ia.property_site,
        ia.igt_part_number,
        ia.eyefi_part_number,
        ia.inspector_name,
        ia.last_update,
        ia.active,
        ia.manual_update,
        ia.created_by,
        ia.created_at,
        ia.updated_at,
        ia.updated_by,
        -- Serial number info if from preloaded
        isn.category as serial_category,
        isn.manufacturer as serial_manufacturer,
        isn.model as serial_model
    FROM igt_assets ia
    LEFT JOIN igt_serial_numbers isn ON ia.serial_number_id = isn.id
    WHERE ia.id = @AssetId;
END;
GO

-- 3. Search IGT assets
CREATE OR ALTER PROCEDURE sp_SearchIGTAssets
    @SearchTerm NVARCHAR(100) = NULL,
    @PropertySite NVARCHAR(200) = NULL,
    @Inspector NVARCHAR(100) = NULL,
    @ActiveOnly BIT = 1,
    @PageNumber INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT 
        ia.id,
        ia.generated_IGT_asset,
        ia.serial_number,
        ia.time_stamp,
        ia.wo_number,
        ia.property_site,
        ia.igt_part_number,
        ia.eyefi_part_number,
        ia.inspector_name,
        ia.active,
        ia.created_at,
        ia.created_by,
        -- Count for pagination
        COUNT(*) OVER() as TotalCount
    FROM igt_assets ia
    WHERE (@SearchTerm IS NULL OR 
           ia.generated_IGT_asset LIKE '%' + @SearchTerm + '%' OR
           ia.serial_number LIKE '%' + @SearchTerm + '%' OR
           ia.wo_number LIKE '%' + @SearchTerm + '%')
    AND (@PropertySite IS NULL OR ia.property_site = @PropertySite)
    AND (@Inspector IS NULL OR ia.inspector_name = @Inspector)
    AND (@ActiveOnly = 0 OR ia.active = 1)
    ORDER BY ia.created_at DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

-- 4. Update IGT asset
CREATE OR ALTER PROCEDURE sp_UpdateIGTAsset
    @AssetId BIGINT,
    @GeneratedIGTAsset NVARCHAR(100) = NULL,
    @SerialNumber NVARCHAR(100) = NULL,
    @WONumber NVARCHAR(100) = NULL,
    @PropertySite NVARCHAR(200) = NULL,
    @IGTPartNumber NVARCHAR(100) = NULL,
    @EyefiPartNumber NVARCHAR(100) = NULL,
    @InspectorName NVARCHAR(100) = NULL,
    @ManualUpdate NVARCHAR(MAX) = NULL,
    @UpdatedBy NVARCHAR(100) = NULL,
    @Active BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        UPDATE igt_assets
        SET 
            generated_IGT_asset = COALESCE(@GeneratedIGTAsset, generated_IGT_asset),
            serial_number = COALESCE(@SerialNumber, serial_number),
            wo_number = COALESCE(@WONumber, wo_number),
            property_site = COALESCE(@PropertySite, property_site),
            igt_part_number = COALESCE(@IGTPartNumber, igt_part_number),
            eyefi_part_number = COALESCE(@EyefiPartNumber, eyefi_part_number),
            inspector_name = COALESCE(@InspectorName, inspector_name),
            manual_update = COALESCE(@ManualUpdate, manual_update),
            active = COALESCE(@Active, active),
            last_update = GETDATE(),
            updated_at = GETDATE(),
            updated_by = @UpdatedBy
        WHERE id = @AssetId;
        
        IF @@ROWCOUNT = 0
        BEGIN
            RAISERROR('IGT Asset not found', 16, 1);
        END
        
        -- Return updated asset
        EXEC sp_GetIGTAssetById @AssetId;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO
