-- ========================================
-- Migration: Align ALL serial tables to utf8mb4_unicode_ci
-- Date: 2026-04-29
-- Purpose: Previous migration converted legacy tables to utf8mb4_unicode_ci.
--          New tables (serial_assignments, ul_labels, igt_serial_numbers) were
--          created with utf8mb4_general_ci (server default), causing UNION
--          collation mismatch error 1271.
--          This migration unifies everything to utf8mb4_unicode_ci so the view
--          can use bare column references with no COLLATE annotations.
-- ========================================

USE eyefidb;

ALTER TABLE serial_assignments
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE ul_labels
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE igt_serial_numbers
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================================
-- Verify all 6 tables now share the same collation
-- ========================================
-- SELECT TABLE_NAME, TABLE_COLLATION
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'eyefidb'
--   AND TABLE_NAME IN ('serial_assignments', 'ul_labels', 'igt_serial_numbers',
--                      'agsSerialGenerator', 'sgAssetGenerator', 'ul_label_usages');
-- Expected: all rows show utf8mb4_unicode_ci
