-- Add targeted indexes for serial availability summary query performance.
-- Safe to run multiple times via INFORMATION_SCHEMA checks.

-- Do not use DATABASE() here because this script is often run from non-eyefidb schemas (for example forms).
SET @schema_name := 'eyefidb';

-- eyefi_serial_numbers: filter by active + status, then join by id/serial_number.
SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'eyefi_serial_numbers'
      AND index_name = 'idx_esn_active_status_id'
  ) = 0,
  'ALTER TABLE eyefidb.eyefi_serial_numbers ADD INDEX idx_esn_active_status_id (is_active, status, id)',
  'SELECT ''idx_esn_active_status_id already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- serial_assignments: EXISTS lookup by eyefi_serial_id with is_voided filter, plus last-7-days consumed_at checks.
SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'serial_assignments'
      AND index_name = 'idx_sa_eyefi_voided_consumed'
  ) = 0,
  'ALTER TABLE eyefidb.serial_assignments ADD INDEX idx_sa_eyefi_voided_consumed (eyefi_serial_id, is_voided, consumed_at)',
  'SELECT ''idx_sa_eyefi_voided_consumed already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ul_label_usages: EXISTS lookup by eyefi_serial_number with is_voided/date filters.
SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'ul_label_usages'
      AND index_name = 'idx_ulu_serial_voided_date'
  ) = 0,
  'ALTER TABLE eyefidb.ul_label_usages ADD INDEX idx_ulu_serial_voided_date (eyefi_serial_number, is_voided, date_used)',
  'SELECT ''idx_ulu_serial_voided_date already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- agsSerialGenerator: EXISTS lookup by serial and active/date predicates.
SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'agsSerialGenerator'
      AND index_name = 'idx_ags_serial_active_ts'
  ) = 0,
  'ALTER TABLE eyefidb.agsSerialGenerator ADD INDEX idx_ags_serial_active_ts (serialNumber, active, timeStamp)',
  'SELECT ''idx_ags_serial_active_ts already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- sgAssetGenerator: this table is currently missing a serialNumber index in production snapshot.
SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'sgAssetGenerator'
      AND index_name = 'idx_sg_serial_number'
  ) = 0,
  'ALTER TABLE eyefidb.sgAssetGenerator ADD INDEX idx_sg_serial_number (serialNumber)',
  'SELECT ''idx_sg_serial_number already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'sgAssetGenerator'
      AND index_name = 'idx_sg_serial_active_ts'
  ) = 0,
  'ALTER TABLE eyefidb.sgAssetGenerator ADD INDEX idx_sg_serial_active_ts (serialNumber, active, timeStamp)',
  'SELECT ''idx_sg_serial_active_ts already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ul_labels: count queries filter by category/is_consumed and sometimes updated_at.
SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'ul_labels'
      AND index_name = 'idx_ul_category_consumed_updated'
  ) = 0,
  'ALTER TABLE eyefidb.ul_labels ADD INDEX idx_ul_category_consumed_updated (category, is_consumed, updated_at)',
  'SELECT ''idx_ul_category_consumed_updated already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- igt_serial_numbers: summary filters on is_active + status, and 7-day usage by used_at.
SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'igt_serial_numbers'
      AND index_name = 'idx_igt_active_status'
  ) = 0,
  'ALTER TABLE eyefidb.igt_serial_numbers ADD INDEX idx_igt_active_status (is_active, status)',
  'SELECT ''idx_igt_active_status already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'igt_serial_numbers'
      AND index_name = 'idx_igt_active_used_at'
  ) = 0,
  'ALTER TABLE eyefidb.igt_serial_numbers ADD INDEX idx_igt_active_used_at (is_active, used_at)',
  'SELECT ''idx_igt_active_used_at already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional verification helpers:
-- SHOW INDEX FROM eyefi_serial_numbers;
-- SHOW INDEX FROM serial_assignments;
-- SHOW INDEX FROM ul_label_usages;
-- SHOW INDEX FROM agsSerialGenerator;
-- SHOW INDEX FROM sgAssetGenerator;
-- SHOW INDEX FROM ul_labels;
-- SHOW INDEX FROM igt_serial_numbers;
