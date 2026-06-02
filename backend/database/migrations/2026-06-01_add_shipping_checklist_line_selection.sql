-- Add selectable ship flag for shipping checklist line items

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'eyefidb'
    AND TABLE_NAME = 'shipping_checklist_instance_lines'
    AND COLUMN_NAME = 'is_selected'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE eyefidb.shipping_checklist_instance_lines ADD COLUMN is_selected TINYINT(1) NOT NULL DEFAULT 1 AFTER line_order',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @second_verifier_email_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'eyefidb'
    AND TABLE_NAME = 'shipping_checklist_instances'
    AND COLUMN_NAME = 'second_verifier_email'
);

SET @sql2 := IF(
  @second_verifier_email_exists = 0,
  'ALTER TABLE eyefidb.shipping_checklist_instances ADD COLUMN second_verifier_email VARCHAR(200) NULL AFTER second_verifier_name',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SET @status_verified_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'eyefidb'
    AND TABLE_NAME = 'shipping_checklist_instances'
    AND COLUMN_NAME = 'status'
    AND COLUMN_TYPE LIKE '%verified%'
);

SET @sql3 := IF(
  @status_verified_exists = 0,
  'ALTER TABLE eyefidb.shipping_checklist_instances MODIFY COLUMN status ENUM(''draft'', ''submitted'', ''verified'') NOT NULL DEFAULT ''draft''',
  'SELECT 1'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;
