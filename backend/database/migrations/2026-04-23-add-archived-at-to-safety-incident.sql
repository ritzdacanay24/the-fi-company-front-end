-- Add archived_at column to safety_incident table.
-- Archived records are hidden from the active list but remain in the database
-- for regulatory/compliance purposes (OSHA retention requirements).
-- Archived records are still visible in the archived view/filter.

ALTER TABLE `eyefidb`.`safety_incident`
  ADD COLUMN `archived_at`  DATETIME NULL DEFAULT NULL AFTER `status`,
  ADD COLUMN `archived_by`  INT(11)  NULL DEFAULT NULL AFTER `archived_at`,
  ADD KEY `idx_safety_incident_archived` (`archived_at`);
