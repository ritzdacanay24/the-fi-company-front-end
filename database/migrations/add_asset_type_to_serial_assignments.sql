-- =============================================
-- Add asset_type column to serial_assignments table
-- Tracks whether assignment uses 'serial' (traditional EyeFi serial tags) 
-- or 'asset_number' (YYYYMMDDXXX format)
-- =============================================

-- Check if column exists and add it if not
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'serial_assignments'
   AND COLUMN_NAME = 'asset_type') = 0,
  'ALTER TABLE serial_assignments ADD COLUMN asset_type ENUM(''serial'', ''asset_number'') DEFAULT ''serial'' COMMENT ''Type of EyeFi identifier: serial = traditional serial tag, asset_number = YYYYMMDDXXX format'';',
  'SELECT ''Column asset_type already exists'' AS Info;'
));

PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Add index for filtering by asset type (check if exists first)
SET @indexStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'serial_assignments'
   AND INDEX_NAME = 'idx_sa_asset_type') = 0,
  'CREATE INDEX idx_sa_asset_type ON serial_assignments(asset_type);',
  'SELECT ''Index idx_sa_asset_type already exists'' AS Info;'
));

PREPARE indexStmt FROM @indexStatement;
EXECUTE indexStmt;
DEALLOCATE PREPARE indexStmt;

-- =============================================
-- Usage:
-- - 'serial' (default): Traditional EyeFi serial tags (EF-2024-00100, etc.)
--   eyefi_serial_id and eyefi_serial_number will be populated
--   eyefi_asset_number_id will be NULL
--
-- - 'asset_number': EYEFI Asset Numbers (20251125001, etc.)
--   eyefi_asset_number_id and generated_asset_number will be populated
--   eyefi_serial_id may or may not be populated depending on if serial tag is also used
-- =============================================
