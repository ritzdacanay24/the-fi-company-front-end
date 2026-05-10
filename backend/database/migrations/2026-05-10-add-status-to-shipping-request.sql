-- Add persisted status to forms.shipping_request.
-- Source of truth: database status column, derived from business criteria.

SET @has_status := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'forms'
    AND TABLE_NAME = 'shipping_request'
    AND COLUMN_NAME = 'status'
);

SET @add_status_sql := IF(
  @has_status = 0,
  'ALTER TABLE `forms`.`shipping_request` ADD COLUMN `status` VARCHAR(30) NOT NULL DEFAULT ''Open'' AFTER `active`',
  'SELECT 1'
);

PREPARE add_status_stmt FROM @add_status_sql;
EXECUTE add_status_stmt;
DEALLOCATE PREPARE add_status_stmt;

-- Backfill using current record state.
-- Force all existing records to Completed.
UPDATE `forms`.`shipping_request`
SET `status` = 'Completed';
