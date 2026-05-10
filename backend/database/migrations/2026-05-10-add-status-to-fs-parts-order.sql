-- Add status field for field service parts orders.
-- Keeps existing archive behavior via active column and backfills practical status values.

SET @has_status := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'eyefidb'
    AND TABLE_NAME = 'fs_parts_order'
    AND COLUMN_NAME = 'status'
);

SET @add_status_sql := IF(
  @has_status = 0,
  'ALTER TABLE `eyefidb`.`fs_parts_order` ADD COLUMN `status` VARCHAR(50) NULL DEFAULT ''Open'' AFTER `so_number`',
  'SELECT 1'
);

PREPARE add_status_stmt FROM @add_status_sql;
EXECUTE add_status_stmt;
DEALLOCATE PREPARE add_status_stmt;

UPDATE `eyefidb`.`fs_parts_order`
SET `status` = CASE
  WHEN COALESCE(`active`, 1) = 0 THEN 'Archived'
  WHEN TRIM(COALESCE(`tracking_number`, '')) <> ''
       AND LOWER(TRIM(COALESCE(`tracking_number`, ''))) NOT IN ('null', 'undefined', 'n/a', 'na', 'none', '-') THEN 'Shipped'
  ELSE 'Open'
END
WHERE `status` IS NULL OR TRIM(`status`) = '';
