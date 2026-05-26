-- Migration: Add performance indexes for vw_all_consumed_serials source tables
-- Goal: Speed up serial assignments list query and NOT EXISTS checks used by vw_all_consumed_serials

USE eyefidb;

-- serial_assignments: helps NOT EXISTS lookups and list sort/filter path
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = 'eyefidb'
        AND table_name = 'serial_assignments'
        AND index_name = 'idx_sa_view_lookup'
    ),
    'SELECT ''idx_sa_view_lookup already exists'' AS status',
    'ALTER TABLE serial_assignments ADD INDEX idx_sa_view_lookup (is_voided, consumed_at, eyefi_serial_number, ul_number)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ul_label_usages: helps base scan + anti-joins by ul_number and eyefi serial
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = 'eyefidb'
        AND table_name = 'ul_label_usages'
        AND index_name = 'idx_ulu_view_lookup'
    ),
    'SELECT ''idx_ulu_view_lookup already exists'' AS status',
    'ALTER TABLE ul_label_usages ADD INDEX idx_ulu_view_lookup (ul_number, eyefi_serial_number, date_used, wo_nbr)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- agsSerialGenerator: helps anti-join by serialNumber and active filter
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = 'eyefidb'
        AND table_name = 'agsSerialGenerator'
        AND index_name = 'idx_ags_view_lookup'
    ),
    'SELECT ''idx_ags_view_lookup already exists'' AS status',
    'ALTER TABLE agsSerialGenerator ADD INDEX idx_ags_view_lookup (active, serialNumber, timeStamp)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- sgAssetGenerator: helps anti-join by serialNumber and active filter
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = 'eyefidb'
        AND table_name = 'sgAssetGenerator'
        AND index_name = 'idx_sg_view_lookup'
    ),
    'SELECT ''idx_sg_view_lookup already exists'' AS status',
    'ALTER TABLE sgAssetGenerator ADD INDEX idx_sg_view_lookup (active, serialNumber, timeStamp)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- igt_serial_numbers: helps status + used_at read path
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = 'eyefidb'
        AND table_name = 'igt_serial_numbers'
        AND index_name = 'idx_igt_used_status_date'
    ),
    'SELECT ''idx_igt_used_status_date already exists'' AS status',
    'ALTER TABLE igt_serial_numbers ADD INDEX idx_igt_used_status_date (status, used_at)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ul_labels join path: ul_label_usages.ul_label_id -> ul_labels.id and category/status filters
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = 'eyefidb'
        AND table_name = 'ul_labels'
        AND index_name = 'idx_ul_category_status_consumed'
    ),
    'SELECT ''idx_ul_category_status_consumed already exists'' AS status',
    'ALTER TABLE ul_labels ADD INDEX idx_ul_category_status_consumed (category, status, is_consumed)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
