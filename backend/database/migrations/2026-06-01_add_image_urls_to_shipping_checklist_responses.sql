-- Add per-item image URL references for shipping checklist responses
-- Safe migration for existing environments where table already exists

SET @schema_name = 'eyefidb';
SET @table_name = 'shipping_checklist_instance_responses';
SET @column_name = 'image_urls_json';

SET @ddl = (
	SELECT IF(
		EXISTS (
			SELECT 1
			FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = @schema_name
				AND TABLE_NAME = @table_name
				AND COLUMN_NAME = @column_name
		),
		'SELECT 1',
		CONCAT(
			'ALTER TABLE `', @schema_name, '`.`', @table_name,
			'` ADD COLUMN `', @column_name, '` JSON NULL AFTER `response_value`'
		)
	)
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
