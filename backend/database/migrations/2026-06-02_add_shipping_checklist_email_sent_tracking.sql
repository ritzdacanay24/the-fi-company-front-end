-- Add email sent tracking for shipping checklist secondary verification

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'eyefidb'
    AND TABLE_NAME = 'shipping_checklist_instances'
    AND COLUMN_NAME = 'second_verifier_email_sent_at'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE eyefidb.shipping_checklist_instances ADD COLUMN second_verifier_email_sent_at DATETIME NULL AFTER second_verifier_email, ADD COLUMN second_verifier_email_sent_by VARCHAR(120) NULL AFTER second_verifier_email_sent_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
