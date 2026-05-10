-- Add status field for field service parts orders.
-- Keeps existing archive behavior via active column and backfills practical status values.

ALTER TABLE `eyefidb`.`fs_parts_order`
  ADD COLUMN IF NOT EXISTS `status` VARCHAR(50) NULL DEFAULT 'Open' AFTER `so_number`;

UPDATE `eyefidb`.`fs_parts_order`
SET `status` = CASE
  WHEN COALESCE(`active`, 1) = 0 THEN 'Archived'
  WHEN TRIM(COALESCE(`tracking_number`, '')) <> ''
       AND LOWER(TRIM(COALESCE(`tracking_number`, ''))) NOT IN ('null', 'undefined', 'n/a', 'na', 'none', '-') THEN 'Shipped'
  ELSE 'Open'
END
WHERE `status` IS NULL OR TRIM(`status`) = '';
