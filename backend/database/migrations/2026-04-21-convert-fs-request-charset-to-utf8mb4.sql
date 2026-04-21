-- Purpose: Fix Incorrect string value errors in Field Service request flows
-- Scope: fs_request + fs_comments (first migration batch)
-- Notes:
-- 1) Take a backup/snapshot before running.
-- 2) Run in maintenance window for production.
-- 3) These tables currently use latin1 in prod schema dump.

-- Optional pre-check
-- SHOW TABLE STATUS WHERE Name IN ('fs_request', 'fs_comments');

ALTER TABLE `eyefidb`.`fs_request`
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

ALTER TABLE `eyefidb`.`fs_comments`
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Optional post-check
-- SHOW FULL COLUMNS FROM `eyefidb`.`fs_request`;
-- SHOW FULL COLUMNS FROM `eyefidb`.`fs_comments`;
-- SHOW TABLE STATUS WHERE Name IN ('fs_request', 'fs_comments');
