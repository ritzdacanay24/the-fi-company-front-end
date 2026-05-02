-- ========================================
-- Migration: Convert legacy serial tables to utf8mb4
-- Date: 2026-04-29
-- Purpose: Fix root cause of CAST(... AS CHAR CHARACTER SET utf8mb4) bloat
--          in vw_all_consumed_serials. Once these tables are utf8mb4,
--          the view can do direct column references without charset coercion.
-- Tables: agsSerialGenerator, sgAssetGenerator, ul_label_usages
-- Note:   serial_assignments, ul_labels, igt_serial_numbers are already utf8mb4
-- ========================================

USE eyefidb;

-- ----------------------------------------
-- 1. agsSerialGenerator
-- ----------------------------------------
ALTER TABLE agsSerialGenerator
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------------------
-- 2. sgAssetGenerator
-- ----------------------------------------
ALTER TABLE sgAssetGenerator
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------------------
-- 3. ul_label_usages
-- ----------------------------------------
ALTER TABLE ul_label_usages
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================================
-- Verify (optional — check after running)
-- ========================================
-- SELECT TABLE_NAME, TABLE_COLLATION
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'eyefidb'
--   AND TABLE_NAME IN ('agsSerialGenerator', 'sgAssetGenerator', 'ul_label_usages',
--                      'serial_assignments', 'ul_labels', 'igt_serial_numbers');
