-- ========================================
-- Migration: Align db.users collation to utf8mb4_unicode_ci
-- Date: 2026-04-29
-- Purpose: Fix UNION collation mismatch in eyefidb views that join db.users
--          (e.g., vw_all_consumed_serials used_by from u.first/u.last).
-- ========================================

-- IMPORTANT:
-- This table is in the `db` schema (not eyefidb).

USE db;

ALTER TABLE users
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================================
-- Verify
-- ========================================
-- SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_COLLATION
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA IN ('db', 'eyefidb')
--   AND ((TABLE_SCHEMA = 'db' AND TABLE_NAME = 'users')
--     OR (TABLE_SCHEMA = 'eyefidb' AND TABLE_NAME IN (
--       'serial_assignments', 'ul_labels', 'igt_serial_numbers',
--       'agsSerialGenerator', 'sgAssetGenerator', 'ul_label_usages'
--     )));
-- Expected: all TABLE_COLLATION = utf8mb4_unicode_ci
